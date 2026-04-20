import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Briefcase, MessageSquare, Bell, LogOut, Loader2, Send, FileText, ExternalLink, CheckCircle, Clock as ClockIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  position: string | null;
  cover_message: string | null;
  cv_url: string | null;
  vacancy_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AppMessage {
  id: string;
  application_id: string;
  sender_id: string;
  sender_role: "staff" | "applicant";
  content: string;
  read: boolean;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/30",
  reviewing: "bg-cyan-brand/10 text-cyan-brand border-cyan-brand/30",
  shortlisted: "bg-accent/10 text-accent border-accent/30",
  interview: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  hired: "bg-green-500/10 text-green-600 border-green-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Submitted",
  reviewing: "Under Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  rejected: "Not Selected",
  hired: "Hired",
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("applications");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth check + redirect if not signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate({ to: "/careers" });
      } else {
        setUser(session.user);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate({ to: "/careers" });
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load applications + notifications
  const loadData = async () => {
    if (!user) return;
    const [appsRes, notifsRes] = await Promise.all([
      supabase.from("job_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setApplications((appsRes.data || []) as Application[]);
    setNotifications((notifsRes.data || []) as Notification[]);
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  // Load messages when an application is selected
  useEffect(() => {
    if (!selectedApp) { setMessages([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("application_messages" as any)
        .select("*")
        .eq("application_id", selectedApp.id)
        .order("created_at", { ascending: true });
      setMessages((data || []) as any);
      // mark staff messages as read
      await supabase
        .from("application_messages" as any)
        .update({ read: true })
        .eq("application_id", selectedApp.id)
        .eq("sender_role", "staff")
        .eq("read", false);
    };
    load();

    const channel = supabase
      .channel(`app-messages-${selectedApp.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "application_messages",
        filter: `application_id=eq.${selectedApp.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as AppMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedApp]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!selectedApp || !reply.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("application_messages" as any).insert({
      application_id: selectedApp.id,
      sender_id: user.id,
      sender_role: "applicant",
      content: reply.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
  };

  const markNotificationRead = async (n: Notification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    // If notification relates to an application, jump to it
    if (n.related_id) {
      const app = applications.find((a) => a.id === n.related_id);
      if (app) {
        setSelectedApp(app);
        setTab("messages");
      }
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    if (!confirm("Clear all notifications?")) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/careers" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-heading font-bold">
              {(displayName || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-heading font-semibold leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/careers" })} className="gap-1.5">
              <Briefcase className="w-4 h-4" /> <span className="hidden sm:inline">Browse Jobs</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading font-bold text-2xl mb-1">My Portal</h1>
          <p className="text-sm text-muted-foreground mb-6">Track your applications, read messages from our team, and stay updated.</p>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="applications" className="gap-1.5">
              <Briefcase className="w-4 h-4" /> Applications
              {applications.length > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 rounded-full">{applications.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> Messages
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 relative">
              <Bell className="w-4 h-4" /> Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* APPLICATIONS */}
          <TabsContent value="applications" className="mt-6">
            {applications.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">You haven't applied to any positions yet.</p>
                <Button onClick={() => navigate({ to: "/careers" })} className="gradient-brand text-primary-foreground">
                  Browse Open Positions
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {applications.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => { setSelectedApp(a); setTab("messages"); }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-cyan-brand/30 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-semibold">{a.position || "Application"}</h3>
                          <Badge className={`text-[10px] border ${STATUS_COLORS[a.status] || ""}`}>
                            {STATUS_LABEL[a.status] || a.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Applied {format(new Date(a.created_at), "MMM d, yyyy")}
                          {a.updated_at !== a.created_at && <> · Updated {format(new Date(a.updated_at), "MMM d, yyyy")}</>}
                        </p>
                        {a.cv_url && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> CV attached
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MESSAGES */}
          <TabsContent value="messages" className="mt-6">
            <div className="grid md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
              {/* Application list */}
              <div className="border border-border rounded-xl bg-card overflow-y-auto">
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversations</p>
                </div>
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No applications yet.</p>
                ) : (
                  applications.map((a) => (
                    <button key={a.id} onClick={() => setSelectedApp(a)}
                      className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${selectedApp?.id === a.id ? "bg-muted" : ""}`}>
                      <p className="font-medium text-sm truncate">{a.position || "Application"}</p>
                      <Badge className={`text-[9px] mt-1 border ${STATUS_COLORS[a.status] || ""}`}>
                        {STATUS_LABEL[a.status] || a.status}
                      </Badge>
                    </button>
                  ))
                )}
              </div>

              {/* Chat */}
              <div className="border border-border rounded-xl bg-card flex flex-col overflow-hidden">
                {!selectedApp ? (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Select an application to view messages.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b border-border bg-muted/30">
                      <p className="font-heading font-semibold text-sm">{selectedApp.position || "Application"}</p>
                      <p className="text-xs text-muted-foreground">Conversation with our hiring team</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          No messages yet. Our team will reach out about your application.
                        </div>
                      ) : (
                        messages.map((m) => {
                          const mine = m.sender_role === "applicant";
                          return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {format(new Date(m.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-t border-border flex gap-2">
                      <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder="Type a reply..." rows={1}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                      <Button onClick={sendReply} disabled={sending || !reply.trim()} size="sm" className="gradient-brand text-primary-foreground">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</p>
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllNotifications}>Clear All</Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} onClick={() => markNotificationRead(n)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${n.read ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`}>
                    <div className="flex items-start gap-3">
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-sm">{n.title}</p>
                        {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
