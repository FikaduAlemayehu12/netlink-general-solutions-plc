import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network, LayoutDashboard, FileText, Users, Trophy, FolderKanban,
  Bell, Settings, LogOut, Menu, ChevronDown, User, Ticket, Clock, MessageSquare, Wallet, Activity, Trash2, Briefcase, Newspaper, ClipboardList, Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";

type NavItem = { label: string; path: string; icon: any; module?: string };

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Plans", path: "/staff/plans", icon: FileText, module: "plans" },
  { label: "Projects", path: "/staff/projects", icon: FolderKanban, module: "projects" },
  { label: "Tickets", path: "/staff/tickets", icon: Ticket, module: "tickets" },
  { label: "Attendance", path: "/staff/attendance", icon: Clock, module: "attendance" },
  { label: "Performance", path: "/staff/performance", icon: Trophy, module: "performance" },
  { label: "Team", path: "/staff/team", icon: Users, module: "team" },
  { label: "Messages", path: "/staff/messages", icon: MessageSquare, module: "messages" },
  { label: "Salary", path: "/staff/salary", icon: Wallet, module: "salary" },
];

const adminItems: NavItem[] = [
  { label: "HR System", path: "/staff/hr", icon: Shield, module: "hr" },
  { label: "User Management", path: "/staff/admin/users", icon: Users, module: "users" },
  { label: "Site CMS", path: "/staff/site-cms", icon: Newspaper, module: "site_cms" },
  { label: "Job Vacancies", path: "/staff/vacancies", icon: Briefcase, module: "vacancies" },
  { label: "Applications", path: "/staff/applications", icon: ClipboardList, module: "applications" },
  { label: "Site Content", path: "/staff/site-content", icon: Newspaper, module: "site_content" },
  { label: "Activity Log", path: "/staff/activity-log", icon: Activity, module: "activity_log" },
  { label: "Recycle Bin", path: "/staff/recycle-bin", icon: Trash2, module: "recycle_bin" },
];

// Map module → tables to query for "new since last visit"
const MODULE_TABLES: Record<string, { table: string; userScoped?: boolean }[]> = {
  plans: [{ table: "plans" }],
  projects: [{ table: "project_groups" }, { table: "project_tasks" }, { table: "project_updates" }],
  tickets: [{ table: "support_tickets" }],
  attendance: [{ table: "leave_requests" }],
  performance: [{ table: "plan_performance_records" }, { table: "quarter_winners" }],
  team: [{ table: "announcements" }],
  messages: [{ table: "messages", userScoped: true }, { table: "direct_messages", userScoped: true }],
  salary: [{ table: "salary_payments" }],
  hr: [{ table: "hr_warnings" }, { table: "experience_letters" }],
  users: [{ table: "profiles" }],
  vacancies: [{ table: "job_vacancies" }],
  applications: [{ table: "job_applications" }],
  site_content: [{ table: "site_content" }],
  activity_log: [{ table: "activity_logs" }],
  recycle_bin: [{ table: "recycle_bin" }],
};

const STORAGE_KEY = "netlink:lastVisit";

function getLastVisit(module: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Date(0).toISOString();
    const map = JSON.parse(raw);
    return map[module] || new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

function setLastVisit(module: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[module] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, isCeo, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unseen, setUnseen] = useState<Record<string, number>>({});

  // Path → module mapping for clearing on visit
  const pathToModule: Record<string, string> = {};
  [...navItems, ...adminItems].forEach((i) => { if (i.module) pathToModule[i.path] = i.module; });

  const fetchUnseen = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const result: Record<string, number> = {};
    const allItems = [...navItems, ...adminItems].filter((i) => i.module);
    await Promise.all(allItems.map(async (item) => {
      const tables = MODULE_TABLES[item.module!];
      if (!tables) return;
      const since = getLastVisit(item.module!);
      let total = 0;
      for (const t of tables) {
        let q = supabase.from(t.table as any).select("*", { count: "exact", head: true }).gt("created_at", since);
        if (t.userScoped) {
          q = q.eq("receiver_id", user.id);
        }
        const { count } = await q;
        total += count || 0;
      }
      if (total > 0) result[item.module!] = total;
    }));
    setUnseen(result);
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
      setNotifCount(count ?? 0);
    };
    fetchNotifs();
    fetchUnseen();
    const channel = supabase.channel("layout-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, fetchNotifs)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, fetchNotifs)
      .subscribe();
    const refreshInterval = setInterval(fetchUnseen, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(refreshInterval); };
  }, [fetchUnseen]);

  // Clear unseen for current module on navigate
  useEffect(() => {
    const mod = pathToModule[location.pathname];
    if (mod) {
      setLastVisit(mod);
      setUnseen((prev) => {
        if (!prev[mod]) return prev;
        const { [mod]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [location.pathname]);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/staff/login" }); };

  const primaryRole = roles[0] as AppRole | undefined;

  const renderNavItem = ({ label, path, icon: Icon, module }: NavItem) => {
    const isActive = location.pathname === path;
    const count = module ? unseen[module] || 0 : 0;
    return (
      <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-heading transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {count > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] px-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center">
          <Network className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-heading font-bold text-sm text-sidebar-foreground">NETLINK</div>
          <div className="text-[9px] text-cyan-brand tracking-widest">STAFF PORTAL</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(renderNavItem)}

        {isCeo && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] font-heading tracking-widest text-sidebar-foreground/40 uppercase">Administration</div>
            {adminItems.map(renderNavItem)}
          </>
        )}
      </nav>

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
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-sidebar-border fixed h-full z-30">
        <SidebarContent />
      </aside>

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

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-card border-b border-border h-14 flex items-center px-4 gap-4 shadow-sm">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />

          <Link to="/staff/notifications" className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

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

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
