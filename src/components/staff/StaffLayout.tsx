import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network, LayoutDashboard, FileText, Users, Trophy, FolderKanban,
  Bell, Settings, LogOut, Menu, X, ChevronDown, User, Ticket, Clock, Megaphone, MessageSquare, Wallet, Activity, Trash2, Briefcase, Newspaper, ClipboardList, Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Plans", path: "/staff/plans", icon: FileText },
  { label: "Projects", path: "/staff/projects", icon: FolderKanban },
  { label: "Tickets", path: "/staff/tickets", icon: Ticket },
  { label: "Attendance", path: "/staff/attendance", icon: Clock },
  { label: "Performance", path: "/staff/performance", icon: Trophy },
  { label: "Team", path: "/staff/team", icon: Users },
  { label: "Messages", path: "/staff/messages", icon: MessageSquare },
  { label: "Salary", path: "/staff/salary", icon: Wallet },
];

const adminItems = [
  { label: "HR System", path: "/staff/hr", icon: Shield },
  { label: "User Management", path: "/staff/admin/users", icon: Users },
  { label: "Job Vacancies", path: "/staff/vacancies", icon: Briefcase },
  { label: "Applications", path: "/staff/applications", icon: ClipboardList },
  { label: "Site Content", path: "/staff/site-content", icon: Newspaper },
  { label: "Activity Log", path: "/staff/activity-log", icon: Activity },
  { label: "Recycle Bin", path: "/staff/recycle-bin", icon: Trash2 },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, isExecutive, isCeo, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      setNotifCount(count ?? 0);
    };
    fetchNotifs();
    const channel = supabase.channel("notif-count").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, fetchNotifs).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/staff/login" }); };

  const primaryRole = roles[0] as AppRole | undefined;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center">
          <Network className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-heading font-bold text-sm text-sidebar-foreground">NETLINK</div>
          <div className="text-[9px] text-cyan-brand tracking-widest">STAFF PORTAL</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => (
          <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-heading transition-colors ${location.pathname === path ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {isCeo && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] font-heading tracking-widest text-sidebar-foreground/40 uppercase">Administration</div>
            {adminItems.map(({ label, path, icon: Icon }) => (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-heading transition-colors ${location.pathname === path ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-primary-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sidebar-foreground text-xs font-semibold font-heading truncate">{profile?.full_name}</div>
            <div className="text-sidebar-foreground/50 text-[10px] truncate">{primaryRole ? ROLE_LABELS[primaryRole] : "Staff"}</div>
          </div>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-destructive/80 hover:bg-destructive/10 hover:text-destructive text-sm font-medium font-heading transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-sidebar-border fixed h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", damping: 25 }} className="fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border z-50 lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center px-4 gap-4 shadow-sm">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />

          {/* Notifications */}
          <Link to="/staff/notifications" className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

          {/* Profile */}
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </div>
              <span className="text-sm font-medium font-heading hidden sm:block text-foreground">{profile?.full_name?.split(" ")[0]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  onMouseLeave={() => setProfileOpen(false)}>
                  <div className="p-3 border-b border-border">
                    <div className="font-heading font-semibold text-sm text-foreground">{profile?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{profile?.email}</div>
                  </div>
                  <div className="p-1">
                    <Link to="/staff/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-foreground">
                      <User className="w-4 h-4" /><span>My Profile</span>
                    </Link>
                    <Link to="/staff/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-foreground">
                      <Settings className="w-4 h-4" /><span>Settings</span>
                    </Link>
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-destructive/10 text-destructive transition-colors">
                      <LogOut className="w-4 h-4" /><span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
