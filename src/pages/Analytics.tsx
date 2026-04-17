import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import {
  TrendingUp, Users, Activity, Shield, Download, RefreshCw,
  BarChart3, PieChart as PieChartIcon, Clock, Zap, Award, Globe
} from "lucide-react";

const revenueData = [
  { month: "Jan", revenue: 420000, target: 380000, clients: 12 },
  { month: "Feb", revenue: 510000, target: 420000, clients: 15 },
  { month: "Mar", revenue: 480000, target: 460000, clients: 14 },
  { month: "Apr", revenue: 620000, target: 500000, clients: 18 },
  { month: "May", revenue: 590000, target: 540000, clients: 17 },
  { month: "Jun", revenue: 710000, target: 600000, clients: 21 },
  { month: "Jul", revenue: 680000, target: 640000, clients: 20 },
  { month: "Aug", revenue: 790000, target: 700000, clients: 24 },
  { month: "Sep", revenue: 850000, target: 750000, clients: 26 },
  { month: "Oct", revenue: 920000, target: 820000, clients: 28 },
  { month: "Nov", revenue: 870000, target: 860000, clients: 27 },
  { month: "Dec", revenue: 1050000, target: 900000, clients: 32 },
];

const serviceData = [
  { name: "Enterprise Network", value: 32, color: "#3b82f6" },
  { name: "Cybersecurity", value: 22, color: "#60a5fa" },
  { name: "Data Center", value: 18, color: "#93c5fd" },
  { name: "Business Automation", value: 15, color: "#1d4ed8" },
  { name: "Smart Infrastructure", value: 13, color: "#2563eb" },
];

const performanceData = [
  { month: "Jan", uptime: 99.8, response: 2.4, satisfaction: 88 },
  { month: "Feb", uptime: 99.9, response: 2.2, satisfaction: 90 },
  { month: "Mar", uptime: 99.7, response: 2.5, satisfaction: 87 },
  { month: "Apr", uptime: 99.95, response: 2.0, satisfaction: 92 },
  { month: "May", uptime: 99.9, response: 1.9, satisfaction: 93 },
  { month: "Jun", uptime: 99.98, response: 1.8, satisfaction: 95 },
  { month: "Jul", uptime: 99.95, response: 1.7, satisfaction: 94 },
  { month: "Aug", uptime: 99.99, response: 1.6, satisfaction: 96 },
];

const kpis = [
  { label: "Project Completion Rate", value: "92%", change: "+5%", up: true },
  { label: "Client Retention",        value: "88%", change: "+3%", up: true },
  { label: "Avg Response Time",       value: "1.8h", change: "-0.6h", up: true },
  { label: "Service Uptime",          value: "99.95%", change: "+0.05%", up: true },
];

const reports = [
  { title: "Q4 Revenue Report",         type: "financial",   date: "2025-12-31", status: "Published" },
  { title: "Network Performance Q4",    type: "technical",   date: "2025-12-28", status: "Published" },
  { title: "Security Audit Summary",    type: "security",    date: "2025-12-15", status: "Published" },
  { title: "Client Satisfaction Survey",type: "operational", date: "2025-11-30", status: "Published" },
  { title: "Annual Compliance Report",  type: "compliance",  date: "2025-11-20", status: "Draft" },
];

const typeColors: Record<string, string> = {
  financial:   "text-green-500 bg-green-500/10",
  technical:   "text-blue-500 bg-blue-500/10",
  security:    "text-amber-500 bg-amber-500/10",
  operational: "text-primary bg-primary/10",
  compliance:  "text-red-500 bg-red-500/10",
};

const BLUE_PALETTE = ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

function StatCard({ title, value, change, icon: Icon, up = true, i = 0 }: {
  title: string; value: string; change: string; icon: typeof TrendingUp; up?: boolean; i?: number;
}) {
  return (
    <motion.div custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
      className="p-5 bg-card rounded-xl border border-border shadow-card flex items-center justify-between gap-3">
      <div>
        <div className="text-2xl font-heading font-bold text-primary">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{title}</div>
        <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${
          up ? "text-green-600 bg-green-500/10" : "text-red-500 bg-red-500/10"
        }`}>{change}</span>
      </div>
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports" | "analytics">("dashboard");

  const tabs: { key: typeof activeTab; label: string; icon: typeof BarChart3 }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "reports",   label: "Reports",   icon: Activity },
    { key: "analytics", label: "Analytics", icon: PieChartIcon },
  ];

  return (
    <main className="min-h-screen pt-16 bg-background">
      {/* Hero */}
      <section className="gradient-hero py-14 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-brand/30 bg-cyan-brand/10 text-cyan-brand text-xs font-medium mb-3 tracking-widest uppercase">
              <Zap className="w-3 h-3" /> Business Intelligence
            </div>
            <h1 className="font-heading font-bold text-4xl md:text-5xl text-primary-foreground mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-primary-foreground/70">Real-time performance insights for Netlink General Solutions</p>
          </motion.div>
          <div className="flex gap-2">
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-cyan-brand/20 bg-navy-light text-primary-foreground text-xs font-heading focus:outline-none focus:ring-1 focus:ring-cyan-brand">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="flex items-center gap-2 px-3 py-2 border border-cyan-brand/20 text-primary-foreground rounded-lg text-xs hover:bg-cyan-brand/10 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-heading font-semibold hover:opacity-90 transition-opacity shadow-md">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Revenue (ETB)" value="5.92M"    change="+18.4%"  icon={TrendingUp} i={0} />
          <StatCard title="Active Clients"       value="32"       change="+8.2%"   icon={Users}      i={1} />
          <StatCard title="Service Uptime"       value="99.95%"   change="+0.05%"  icon={Activity}   i={2} />
          <StatCard title="Security Score"       value="98.5"     change="+2.1"    icon={Shield}      i={3} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-heading font-semibold border-b-2 transition-all -mb-px ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Revenue & Performance charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-6">
                <h3 className="font-heading font-bold text-lg mb-4">Revenue Trends (ETB)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 30% 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`ETB ${Number(v).toLocaleString()}`, ""]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="target"  name="Target"  stroke="#1d4ed8" fill="url(#targetGrad)" strokeWidth={2} strokeDasharray="5 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-card rounded-xl border border-border shadow-card p-6">
                <h3 className="font-heading font-bold text-lg mb-4">Service Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {serviceData.map((entry, index) => (
                        <Cell key={entry.name} fill={BLUE_PALETTE[index % BLUE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {serviceData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BLUE_PALETTE[i % BLUE_PALETTE.length] }} />
                        <span className="text-muted-foreground truncate max-w-[130px]">{s.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Performance + KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-card rounded-xl border border-border shadow-card p-6">
                <h3 className="font-heading font-bold text-lg mb-4">Service Performance</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={performanceData.slice(-6)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 30% 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="satisfaction" name="Satisfaction %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="uptime" name="Uptime %" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-card rounded-xl border border-border shadow-card p-6">
                <h3 className="font-heading font-bold text-lg mb-5">Key Performance Indicators</h3>
                <div className="grid grid-cols-2 gap-4">
                  {kpis.map(({ label, value, change, up }, i) => (
                    <div key={label} className={`p-4 rounded-xl border transition-colors ${
                      i % 2 === 0 ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/30"
                    }`}>
                      <div className="font-heading font-bold text-2xl text-primary">{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</div>
                      <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        up ? "text-green-600 bg-green-500/10" : "text-red-500 bg-red-500/10"
                      }`}>{change}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl">Available Reports ({reports.length})</h3>
              <button className="flex items-center gap-2 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-heading font-semibold hover:opacity-90 shadow-md">
                <Download className="w-3.5 h-3.5" /> Export All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((r, i) => (
                <motion.div key={r.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className="p-5 bg-card rounded-xl border border-border shadow-card hover:border-primary/30 hover:shadow-glow transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-heading font-semibold text-sm">{r.title}</h4>
                      <div className="text-xs text-muted-foreground mt-1">{r.date}</div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[r.type] ?? "text-muted-foreground bg-muted"}`}>
                        {r.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === "Published" ? "text-green-600 bg-green-500/10" : "text-amber-500 bg-amber-500/10"
                      }`}>{r.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 rounded-lg border border-primary/30 text-primary text-xs font-heading font-semibold hover:bg-primary/10 transition-colors">
                      View Report
                    </button>
                    <button className="px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs hover:border-primary/30 hover:text-primary transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h3 className="font-heading font-bold text-xl">Advanced Analytics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-card rounded-xl border border-border shadow-card p-6">
                <h4 className="font-heading font-bold text-lg mb-4">Monthly Client Growth</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 30% 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="clients" name="Active Clients" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#2563eb", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-card rounded-xl border border-border shadow-card p-6">
                <h4 className="font-heading font-bold text-lg mb-4">Response Time Trend (hrs)</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 30% 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="response" name="Avg Response (h)" stroke="#60a5fa" fill="url(#respGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Global reach */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-card rounded-xl border border-border shadow-card p-6">
              <h4 className="font-heading font-bold text-lg mb-5">Regional Presence</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { region: "Addis Ababa", clients: 24, share: "75%", icon: Award },
                  { region: "Oromia",      clients: 4,  share: "12%", icon: Globe },
                  { region: "Amhara",      clients: 3,  share: "9%",  icon: Globe },
                  { region: "Other",       clients: 1,  share: "4%",  icon: Globe },
                ].map(({ region, clients, share, icon: Icon }) => (
                  <div key={region} className="p-4 rounded-xl border border-primary/15 bg-primary/5 text-center">
                    <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="font-heading font-bold text-xl text-primary">{share}</div>
                    <div className="text-xs text-muted-foreground">{region}</div>
                    <div className="text-[11px] text-primary mt-1">{clients} clients</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </main>
  );
}
