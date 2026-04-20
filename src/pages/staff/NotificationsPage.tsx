import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, CheckCheck, MessageCircle, Award, Trophy, UserPlus, AtSign, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StaffLayout from "@/components/staff/StaffLayout";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  mention: { icon: AtSign, color: "text-primary", bg: "bg-primary/10" },
  comment: { icon: MessageCircle, color: "text-cyan-brand", bg: "bg-cyan-brand/10" },
  points: { icon: Award, color: "text-gold", bg: "bg-gold/10" },
  winner: { icon: Trophy, color: "text-gold", bg: "bg-gold/10" },
  winner_announce: { icon: Trophy, color: "text-gold", bg: "bg-gold/10" },
  task: { icon: UserPlus, color: "text-accent", bg: "bg-accent/10" },
  message: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
  call: { icon: MessageCircle, color: "text-accent", bg: "bg-accent/10" },
};

const getNotificationRoute = (n: any): string | null => {
  switch (n.type) {
    case "message":
    case "call":
      return n.related_id ? `/staff/messages?partner=${n.related_id}` : "/staff/messages";
    case "mention":
    case "comment":
      return "/staff/plans";
    case "points":
    case "winner":
    case "winner_announce":
      return "/staff/performance";
    case "task":
      return "/staff/projects";
    default:
      return null;
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchNotifications();
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    const route = getNotificationRoute(n);
    if (route) navigate({ to: route });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <StaffLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notifications
              {unreadCount > 0 && <span className="text-sm bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">{unreadCount}</span>}
            </h1>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead} className="gap-1.5">
              <CheckCheck className="w-4 h-4" />Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-heading">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };
              return (
                <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card onClick={() => handleNotificationClick(n)} className={`cursor-pointer transition-all hover:shadow-card ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <cfg.icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold font-heading ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</div>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                        <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
