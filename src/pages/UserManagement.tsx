import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Mail, Shield, Edit2, Trash2, Plus, Search,
  Crown, Briefcase, Code2, Network, Server, ChevronDown,
  CheckCircle, XCircle, Eye, EyeOff
} from "lucide-react";

type Role = "admin" | "manager" | "engineer" | "staff";
type Department = "Executive" | "Technology" | "Business Development" | "Engineering" | "Infrastructure" | "Software";

interface User {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  role: Role;
  department: Department;
  email: string;
  phone?: string;
  active: boolean;
  joinDate: string;
}

const roleConfig: Record<Role, { label: string; color: string; bg: string; icon: typeof Crown }> = {
  admin:     { label: "Admin",    color: "text-red-500",   bg: "bg-red-500/10",   icon: Crown },
  manager:   { label: "Manager",  color: "text-amber-500", bg: "bg-amber-500/10", icon: Briefcase },
  engineer:  { label: "Engineer", color: "text-cyan-brand",bg: "bg-cyan-brand/10",icon: Network },
  staff:     { label: "Staff",    color: "text-primary",   bg: "bg-primary/10",   icon: Users },
};

const users: User[] = [
  { id: 1,  name: "Fikadu Alemayehu",  firstName: "fikadu",  lastName: "alemayehu", role: "admin",    department: "Executive",            email: "fikadu@netlink-gs.com",    phone: "+251910340909", active: true,  joinDate: "2024-01-01" },
  { id: 2,  name: "Feyisa Bekele",     firstName: "feyisa",  lastName: "bekele",    role: "manager",  department: "Technology",           email: "feyisa@netlink-gs.com",    phone: "+251913671010", active: true,  joinDate: "2024-02-01" },
  { id: 3,  name: "Ysak Alemayehu",   firstName: "ysak",    lastName: "alemayehu", role: "manager",  department: "Business Development",  email: "ysak@netlink-gs.com",      active: true,  joinDate: "2024-02-15" },
  { id: 4,  name: "Hana Alemu",        firstName: "hana",    lastName: "alemu",     role: "manager",  department: "Software",             email: "hana@netlink-gs.com",      active: true,  joinDate: "2024-03-01" },
  { id: 5,  name: "Haftu",             firstName: "haftu",   lastName: "",          role: "engineer", department: "Software",             email: "haftu@netlink-gs.com",     active: true,  joinDate: "2024-03-10" },
  { id: 6,  name: "Kirubel Asrat",    firstName: "kirubel", lastName: "asrat",     role: "engineer", department: "Software",             email: "kirubel@netlink-gs.com",   active: true,  joinDate: "2024-03-10" },
  { id: 7,  name: "Getachew Adamu",   firstName: "getachew",lastName: "adamu",     role: "engineer", department: "Software",             email: "getachew@netlink-gs.com",  active: true,  joinDate: "2024-04-01" },
  { id: 8,  name: "Oumer Kasaw",      firstName: "oumer",   lastName: "kasaw",     role: "engineer", department: "Engineering",          email: "oumer@netlink-gs.com",     active: true,  joinDate: "2024-04-01" },
  { id: 9,  name: "Lalisa",            firstName: "lalisa",  lastName: "",          role: "engineer", department: "Engineering",          email: "lalisa@netlink-gs.com",    active: true,  joinDate: "2024-04-05" },
  { id: 10, name: "Fayera",            firstName: "fayera",  lastName: "",          role: "engineer", department: "Engineering",          email: "fayera@netlink-gs.com",    active: true,  joinDate: "2024-04-05" },
  { id: 11, name: "Henok",             firstName: "henok",   lastName: "",          role: "engineer", department: "Engineering",          email: "henok@netlink-gs.com",     active: true,  joinDate: "2024-04-10" },
  { id: 12, name: "Endale",            firstName: "endale",  lastName: "",          role: "staff",    department: "Infrastructure",       email: "endale@netlink-gs.com",    active: true,  joinDate: "2024-05-01" },
  { id: 13, name: "Abebe",             firstName: "abebe",   lastName: "",          role: "staff",    department: "Infrastructure",       email: "abebe@netlink-gs.com",     active: true,  joinDate: "2024-05-01" },
  { id: 14, name: "Abdi",              firstName: "abdi",    lastName: "",          role: "staff",    department: "Infrastructure",       email: "abdi@netlink-gs.com",      active: true,  joinDate: "2024-05-15" },
];

const sharedEmails = [
  { email: "info@netlink-gs.com",    description: "General inquiries",      icon: Mail },
  { email: "sales@netlink-gs.com",   description: "Sales & partnerships",   icon: Briefcase },
  { email: "contact@netlink-gs.com", description: "Contact form recipient", icon: CheckCircle },
  { email: "support@netlink-gs.com", description: "Technical support",      icon: Network },
];

const roleOrder: Role[] = ["admin", "manager", "engineer", "staff"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [showEmails, setShowEmails] = useState<Record<number, boolean>>({});

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  }).sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "admin").length,
    managers: users.filter(u => u.role === "manager").length,
    engineers: users.filter(u => u.role === "engineer").length,
  };

  return (
    <main className="min-h-screen pt-16 bg-background">
      {/* Hero */}
      <section className="gradient-hero py-16 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-brand/30 bg-cyan-brand/10 text-cyan-brand text-xs font-medium mb-4 tracking-widest uppercase">
              <Shield className="w-3 h-3" /> Admin Portal
            </div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl text-primary-foreground mb-3">
              User Management
            </h1>
            <p className="text-primary-foreground/70 max-w-xl">
              Manage team members, roles, and Outlook email accounts for <span className="text-cyan-brand font-semibold">netlink-gs.com</span>
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users",  value: stats.total,     icon: Users,    color: "text-primary",    bg: "bg-primary/10" },
            { label: "Admins",       value: stats.admins,    icon: Crown,    color: "text-red-500",    bg: "bg-red-500/10" },
            { label: "Managers",     value: stats.managers,  icon: Briefcase,color: "text-amber-500",  bg: "bg-amber-500/10" },
            { label: "Engineers",    value: stats.engineers, icon: Code2,    color: "text-cyan-brand", bg: "bg-cyan-brand/10" },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <motion.div key={label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="p-5 bg-card rounded-xl border border-border shadow-card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className={`font-heading font-bold text-2xl ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Shared company emails */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-card rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">Shared Company Emails</h2>
              <p className="text-xs text-muted-foreground">Domain: netlink-gs.com</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sharedEmails.map(({ email, description, icon: Icon }) => (
              <div key={email} className="p-4 rounded-xl border border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="font-heading font-semibold text-sm text-foreground truncate">{email}</div>
                <div className="text-xs text-muted-foreground mt-1">{description}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or department…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "admin", "manager", "engineer", "staff"] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold tracking-wide border transition-all capitalize ${
                  filterRole === r
                    ? "gradient-brand text-primary-foreground border-transparent shadow-glow"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}>
                {r === "all" ? "All Roles" : roleConfig[r]?.label ?? r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-primary-foreground rounded-lg text-sm font-heading font-semibold hover:opacity-90 transition-opacity shadow-md whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* User cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((user, i) => {
            const rc = roleConfig[user.role];
            const RoleIcon = rc.icon;
            const isExpanded = expandedUser === user.id;
            const emailVisible = showEmails[user.id];

            return (
              <motion.div key={user.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className={`bg-card rounded-xl border transition-all duration-200 shadow-card overflow-hidden ${
                  isExpanded ? "border-primary/40 shadow-glow" : "border-border hover:border-primary/30"
                }`}>
                {/* Card top */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center font-heading font-bold text-primary-foreground text-sm shrink-0">
                        {user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-heading font-semibold text-sm truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.department}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rc.color} ${rc.bg}`}>
                        <RoleIcon className="w-3 h-3" />
                        {rc.label}
                      </span>
                      {user.active
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>

                  {/* Outlook email */}
                  <div className="mt-4 p-3 rounded-lg bg-secondary/40 border border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground tracking-wider uppercase font-medium">Outlook Email</div>
                          <div className="text-xs font-medium text-foreground truncate font-mono">
                            {emailVisible ? user.email : user.email.replace(/(?<=.{3}).*(?=@)/, "***")}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setShowEmails(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        {emailVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable section */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="w-full flex items-center justify-between px-5 py-2.5 border-t border-border/60 text-xs text-muted-foreground hover:bg-secondary/30 transition-colors">
                  <span>Details</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-border/40 bg-secondary/20 space-y-2 text-sm">
                    {user.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Phone</span>
                        <span className="font-mono text-xs">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Joined</span>
                      <span className="text-xs">{new Date(user.joinDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Status</span>
                      <span className={`text-xs font-medium ${user.active ? "text-green-500" : "text-red-400"}`}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/30 text-primary text-xs font-heading font-semibold hover:bg-primary/10 transition-colors">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-400/30 text-red-400 text-xs font-heading font-semibold hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No users found matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
