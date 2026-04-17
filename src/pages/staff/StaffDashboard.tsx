import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Trophy, FolderKanban, Bell, TrendingUp, Plus, Award, Ticket, Clock, Megaphone, Users, Send, X, AlertTriangle, ThumbsUp, Heart, Laugh, Frown, ThumbsDown, MessageSquare, Briefcase, Newspaper, Image } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StaffLayout from "@/components/staff/StaffLayout";
import OverdueMilestonesWidget from "@/components/staff/OverdueMilestonesWidget";

const REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "👎", label: "Dislike" },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }) };

export default function StaffDashboard() {
  const { user, profile, roles, isExecutive, isCeo } = useAuth();
  const [stats, setStats] = useState({ plans: 0, projects: 0, notifications: 0, points: 0, tickets: 0, attendance: 0 });
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", priority: "normal", pinned: false });
  const [posting, setPosting] = useState(false);
  const [perfScores, setPerfScores] = useState({ daily: 0, weekly: 0, quarterly: 0 });
  // Announcement detail state
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [annReactions, setAnnReactions] = useState<any[]>([]);
  const [annComments, setAnnComments] = useState<any[]>([]);
  const [annComment, setAnnComment] = useState("");
  const [annProfiles, setAnnProfiles] = useState<Record<string, string>>({});
  // New: internal vacancies & site content
  const [internalVacancies, setInternalVacancies] = useState<any[]>([]);
  const [staffContent, setStaffContent] = useState<any[]>([]);

  const currentQuarter = () => {
    const now = new Date();
    return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const q = currentQuarter();

      const [plansRes, projRes, notifRes, scoresRes, recentRes, winnerRes, ticketsRes, attendRes, announcementsRes] = await Promise.all([
        supabase.from("plans").select("id", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("project_groups").select("id", { count: "exact", head: true }),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
        supabase.from("performance_scores").select("points").eq("staff_id", user.id).eq("quarter", q),
        supabase.from("plans").select("*, profiles!plans_author_id_fkey(full_name, position)").order("created_at", { ascending: false }).limit(5),
        supabase.from("quarter_winners").select("*, winner:profiles!quarter_winners_winner_id_fkey(full_name, position, avatar_url)").eq("quarter", q).maybeSingle(),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("clock_in", today + "T00:00:00"),
        supabase.from("announcements").select("*, profiles!announcements_author_id_fkey(full_name)").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
      ]);

      const totalPoints = (scoresRes.data || []).reduce((sum: number, s: any) => sum + (s.points || 0), 0);
      setStats({
        plans: plansRes.count ?? 0,
        projects: projRes.count ?? 0,
        notifications: notifRes.count ?? 0,
        points: totalPoints,
        tickets: ticketsRes.count ?? 0,
        attendance: attendRes.count ?? 0,
      });
      setRecentPlans(recentRes.data || []);
      setAnnouncements(announcementsRes.data || []);
      if (winnerRes.data) setWinner(winnerRes.data);

      // Load performance scores by plan type approval
      const [dailyRes, weeklyRes, quarterlyRes] = await Promise.all([
        supabase.from("plans").select("id, plan_reactions(reaction)").eq("author_id", user.id).eq("plan_type", "daily"),
        supabase.from("plans").select("id, plan_reactions(reaction)").eq("author_id", user.id).eq("plan_type", "weekly"),
        supabase.from("plans").select("id, plan_reactions(reaction)").eq("author_id", user.id).eq("plan_type", "quarterly"),
      ]);

      const countApprovals = (data: any[]) => {
        let approvals = 0;
        for (const plan of data || []) {
          approvals += (plan.plan_reactions || []).filter((r: any) => r.reaction === "approve").length;
        }
        return approvals;
      };

      setPerfScores({
        daily: countApprovals(dailyRes.data || []),
        weekly: countApprovals(weeklyRes.data || []),
        quarterly: countApprovals(quarterlyRes.data || []),
      });

      // Load internal vacancies & staff site content
      const [vacRes, contentRes] = await Promise.all([
        supabase.from("job_vacancies" as any).select("*").eq("status", "published").in("vacancy_type", ["internal", "external"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("site_content" as any).select("*").eq("status", "published").in("audience", ["staff", "both"]).order("created_at", { ascending: false }).limit(5),
      ]);
      setInternalVacancies(vacRes.data || []);
      setStaffContent(contentRes.data || []);

      setLoading(false);
    };
    load();
  }, []);

  // Announcement detail helpers
  const openAnnouncement = async (a: any) => {
    setSelectedAnnouncement(a);
    // Load profiles map
    const { data: profs } = await supabase.from("profiles").select("user_id, full_name");
    const map: Record<string, string> = {};
    for (const p of profs || []) map[p.user_id] = p.full_name;
    setAnnProfiles(map);
    // Load reactions
    const { data: rxns } = await supabase.from("announcement_reactions" as any).select("*").eq("announcement_id", a.id);
    setAnnReactions((rxns || []) as any);
    // Load comments
    const { data: cmts } = await supabase.from("announcement_comments" as any).select("*").eq("announcement_id", a.id).order("created_at", { ascending: true });
    setAnnComments((cmts || []) as any);
  };

  const toggleAnnReaction = async (emoji: string) => {
    if (!selectedAnnouncement || !user) return;
    const existing = annReactions.find((r: any) => r.user_id === user.id && r.reaction === emoji);
    if (existing) {
      await supabase.from("announcement_reactions" as any).delete().eq("id", existing.id);
      setAnnReactions(annReactions.filter((r: any) => r.id !== existing.id));
    } else {
      const { data } = await supabase.from("announcement_reactions" as any).insert({ announcement_id: selectedAnnouncement.id, user_id: user.id, reaction: emoji }).select().single();
      if (data) setAnnReactions([...annReactions, data as any]);
    }
  };

  const postAnnComment = async () => {
    if (!annComment.trim() || !selectedAnnouncement || !user) return;
    const { data } = await supabase.from("announcement_comments" as any).insert({ announcement_id: selectedAnnouncement.id, author_id: user.id, content: annComment.trim() }).select().single();
    if (data) setAnnComments([...annComments, data as any]);
    setAnnComment("");
  };

  const postAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    setPosting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("announcements").insert({
      title: announcementForm.title,
      content: announcementForm.content,
      priority: announcementForm.priority,
      pinned: announcementForm.pinned,
      author_id: user.id,
    });

    // Send dashboard notifications to all staff
    const { data: allProfiles } = await supabase.from("profiles").select("user_id, email");
    const recipients: string[] = [];
    for (const p of allProfiles || []) {
      if (p.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: p.user_id, type: "announcement",
          title: `📢 ${announcementForm.title}`,
          message: announcementForm.content.slice(0, 100),
        });
      }
      recipients.push(p.email);
    }

    // Send email via edge function
    try {
      await supabase.functions.invoke("send-announcement-email", {
        body: { title: announcementForm.title, content: announcementForm.content, recipients },
      });
    } catch (err) {
      console.error("Email send failed:", err);
    }

    setAnnouncementForm({ title: "", content: "", priority: "normal", pinned: false });
    setShowAnnouncement(false);
    setPosting(false);

    // Reload announcements
    const { data: newAnnouncements } = await supabase.from("announcements").select("*, profiles!announcements_author_id_fkey(full_name)").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3);
    setAnnouncements(newAnnouncements || []);
  };

  const role = roles[0];

  const statCards = [
    { icon: FileText, label: "My Plans", value: stats.plans, color: "text-primary", link: "/staff/plans" },
    { icon: FolderKanban, label: "Projects", value: stats.projects, color: "text-cyan-brand", link: "/staff/projects" },
    { icon: Ticket, label: "Open Tickets", value: stats.tickets, color: "text-gold", link: "/staff/tickets" },
    { icon: Bell, label: "Notifications", value: stats.notifications, color: "text-destructive", link: "/staff/notifications" },
    { icon: Trophy, label: "Q Points", value: stats.points, color: "text-primary", link: "/staff/performance" },
    { icon: Clock, label: "Clocked In", value: stats.attendance > 0 ? "Yes" : "No", color: stats.attendance > 0 ? "text-accent" : "text-muted-foreground", link: "/staff/attendance" },
  ];

  return (
    <StaffLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Welcome back, <span className="text-primary">{profile?.full_name?.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{profile?.position || role?.toUpperCase()} · {profile?.email}</p>
        </motion.div>

        {/* Winner Banner */}
        {winner && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl gradient-brand p-6 text-primary-foreground shadow-glow">
            <div className="absolute inset-0 network-pattern opacity-20" />
            <div className="relative z-10 flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-primary-foreground/20 border-4 border-gold flex items-center justify-center text-3xl font-heading font-bold shadow-[0_0_20px_hsl(220_100%_65%/0.5)]">
                  {winner.winner?.avatar_url ? (
                    <img src={winner.winner.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : winner.winner?.full_name?.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gold rounded-full p-1">
                  <Trophy className="w-3 h-3 text-navy" />
                </div>
              </div>
              <div>
                <div className="text-xs font-heading tracking-widest opacity-80 uppercase">🏆 Champion of the Quarter · {winner.quarter}</div>
                <div className="text-2xl font-heading font-bold mt-0.5">{winner.winner?.full_name}</div>
                <div className="text-primary-foreground/70 text-sm">{winner.winner?.position}</div>
                {winner.message && <p className="text-primary-foreground/80 text-sm mt-2 max-w-md">{winner.message}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <Link to={s.link}>
                <Card className="hover:shadow-card transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-2xl font-heading font-bold ${s.color}`}>{loading ? "—" : s.value}</div>
                        <div className="text-muted-foreground text-[11px] font-medium mt-0.5">{s.label}</div>
                      </div>
                      <s.icon className={`w-7 h-7 ${s.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Performance Scores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />My Performance Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Daily Approvals", value: perfScores.daily, color: "text-primary" },
                { label: "Weekly Approvals", value: perfScores.weekly, color: "text-cyan-brand" },
                { label: "Quarterly Approvals", value: perfScores.quarterly, color: "text-gold" },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-muted/50">
                  <div className={`text-3xl font-heading font-bold ${s.color}`}>{loading ? "—" : s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Three columns */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Announcements */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-primary" />Announcements
                  {isCeo && (
                    <button onClick={() => setShowAnnouncement(!showAnnouncement)} className="ml-auto text-primary hover:text-primary/80">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* CEO Announcement Form */}
                {showAnnouncement && isCeo && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 pb-3 border-b border-border">
                    <Input placeholder="Announcement title" value={announcementForm.title} onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))} />
                    <textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="Announcement content..." rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input type="checkbox" checked={announcementForm.pinned} onChange={(e) => setAnnouncementForm((f) => ({ ...f, pinned: e.target.checked }))} className="rounded" />
                        Pin
                      </label>
                      <select value={announcementForm.priority} onChange={(e) => setAnnouncementForm((f) => ({ ...f, priority: e.target.value }))}
                        className="text-xs rounded border border-input bg-background px-2 py-1">
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowAnnouncement(false)} className="flex-1">Cancel</Button>
                      <Button size="sm" onClick={postAnnouncement} disabled={posting} className="flex-1 gradient-brand text-primary-foreground font-heading gap-1">
                        <Send className="w-3 h-3" />{posting ? "Posting…" : "Post & Notify"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {announcements.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No announcements</p>}
                {announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => openAnnouncement(a)}>
                    <div className="flex items-center gap-2">
                      {a.pinned && <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Pinned</Badge>}
                      {a.priority === "urgent" && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                      <span className="text-sm font-heading font-semibold text-foreground">{a.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="text-[10px] text-muted-foreground">{a.profiles?.full_name} · {new Date(a.created_at).toLocaleDateString()}</div>
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Plans */}
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-heading">Recent Plans</CardTitle>
                <Link to="/staff/plans">
                  <Button size="sm" className="gradient-brand text-primary-foreground font-heading gap-1.5">
                    <Plus className="w-3.5 h-3.5" />Submit
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentPlans.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No plans yet</p>}
                {recentPlans.map((plan) => (
                  <div key={plan.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-heading font-semibold uppercase ${plan.plan_type === 'daily' ? 'bg-primary/10 text-primary' : plan.plan_type === 'weekly' ? 'bg-cyan-brand/10 text-cyan-brand' : 'bg-gold/10 text-gold'}`}>
                      {plan.plan_type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold font-heading text-foreground truncate">{plan.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{plan.profiles?.full_name} · {new Date(plan.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-heading">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Submit Daily Plan", icon: FileText, path: "/staff/plans?type=daily", color: "text-primary" },
                  { label: "Create Ticket", icon: Ticket, path: "/staff/tickets", color: "text-gold" },
                  { label: "Clock In/Out", icon: Clock, path: "/staff/attendance", color: "text-accent" },
                  { label: "View Performance", icon: Award, path: "/staff/performance", color: "text-primary" },
                  { label: "My Projects", icon: FolderKanban, path: "/staff/projects", color: "text-cyan-brand" },
                ].map((a) => (
                  <Link key={a.path} to={a.path} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group">
                    <a.icon className={`w-4 h-4 ${a.color}`} />
                    <span className="text-sm font-medium text-foreground">{a.label}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Overdue Milestones Widget (visible to CEO/executives) */}
            {isExecutive && <OverdueMilestonesWidget />}

            {isCeo && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading text-primary">CEO Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/staff/admin/users" className="flex items-center gap-2 text-sm p-2 rounded hover:bg-primary/10 transition-colors text-foreground">
                    <Users className="w-4 h-4" />Manage Users
                  </Link>
                  <Link to="/staff/performance" className="flex items-center gap-2 text-sm p-2 rounded hover:bg-primary/10 transition-colors text-foreground">
                    <Trophy className="w-4 h-4" />Assign Points
                  </Link>
                  <button onClick={() => setShowAnnouncement(true)} className="w-full flex items-center gap-2 text-sm p-2 rounded hover:bg-primary/10 transition-colors text-foreground text-left">
                    <Megaphone className="w-4 h-4" />Post Announcement
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Internal Vacancies & Staff Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Internal Vacancies */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" />Job Openings
              </CardTitle>
              {isCeo && (
                <Link to="/staff/vacancies">
                  <Button size="sm" variant="outline" className="text-xs gap-1"><Plus className="w-3 h-3" />Manage</Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {internalVacancies.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No openings</p>}
              {internalVacancies.map((v: any) => (
                <Link key={v.id} to="/staff/vacancies" className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-heading font-semibold ${v.vacancy_type === "internal" ? "bg-gold/10 text-gold" : "bg-cyan-brand/10 text-cyan-brand"}`}>
                      {v.vacancy_type === "internal" ? "Internal" : "External"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{v.employment_type}</Badge>
                  </div>
                  <div className="text-sm font-heading font-semibold">{v.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {v.department && `${v.department} · `}{v.openings} opening{v.openings > 1 ? "s" : ""}
                    {v.deadline && ` · Due ${new Date(v.deadline).toLocaleDateString()}`}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Staff News & Content */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-1.5">
                <Newspaper className="w-4 h-4 text-primary" />News & Content
              </CardTitle>
              {isCeo && (
                <Link to="/staff/site-content">
                  <Button size="sm" variant="outline" className="text-xs gap-1"><Plus className="w-3 h-3" />Manage</Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {staffContent.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No content published</p>}
              {staffContent.map((c: any) => (
                <Link key={c.id} to="/staff/site-content" className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-heading font-semibold ${c.content_type === "news" ? "bg-primary/10 text-primary" : c.content_type === "testimonial" ? "bg-gold/10 text-gold" : "bg-cyan-brand/10 text-cyan-brand"}`}>
                      {c.content_type}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.audience === "staff" ? "bg-muted text-muted-foreground" : c.audience === "client" ? "bg-cyan-brand/10 text-cyan-brand" : "bg-primary/10 text-primary"}`}>
                      {c.audience === "both" ? "Staff & Client" : c.audience}
                    </span>
                  </div>
                  <div className="text-sm font-heading font-semibold">{c.title}</div>
                  {c.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.content}</p>}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Announcement Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={o => { if (!o) setSelectedAnnouncement(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" /> {selectedAnnouncement.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedAnnouncement.pinned && <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">Pinned</Badge>}
                  {selectedAnnouncement.priority === "urgent" && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                  {selectedAnnouncement.priority === "high" && <Badge className="bg-gold/10 text-gold text-xs">High Priority</Badge>}
                  <span className="text-xs text-muted-foreground">by {selectedAnnouncement.profiles?.full_name} · {new Date(selectedAnnouncement.created_at).toLocaleDateString()}</span>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap leading-relaxed">{selectedAnnouncement.content}</div>

                {/* Reactions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {REACTIONS.map(r => {
                    const reactors = annReactions.filter((rx: any) => rx.reaction === r.emoji);
                    const myReaction = reactors.find((rx: any) => rx.user_id === user?.id);
                    return (
                      <Tooltip key={r.emoji}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleAnnReaction(r.emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${myReaction ? "border-primary bg-primary/10" : "border-border hover:border-primary/30 bg-card"}`}
                          >
                            <span>{r.emoji}</span>
                            {reactors.length > 0 && <span className="font-medium">{reactors.length}</span>}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{r.label}{reactors.length > 0 && `: ${reactors.map((rx: any) => annProfiles[rx.user_id] || "Unknown").join(", ")}`}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Comments */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Comments ({annComments.length})</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {annComments.map((c: any) => (
                      <div key={c.id} className="flex gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center flex-shrink-0 text-primary-foreground text-[10px] font-bold">
                          {(annProfiles[c.author_id] || "?").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{annProfiles[c.author_id] || "Unknown"}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={annComment} onChange={e => setAnnComment(e.target.value)} placeholder="Write a comment..."
                      onKeyDown={e => e.key === "Enter" && postAnnComment()} className="flex-1" />
                    <Button size="sm" onClick={postAnnComment} disabled={!annComment.trim()} className="gradient-brand text-primary-foreground gap-1">
                      <Send className="w-3 h-3" /> Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
