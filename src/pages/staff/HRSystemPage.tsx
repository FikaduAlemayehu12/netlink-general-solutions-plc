import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Users, Briefcase, Clock, DollarSign, TrendingUp, AlertTriangle,
  FileText, Shield, Bell, ChevronRight, BarChart3, Award, Calendar,
  CheckCircle, XCircle, UserCheck, UserX, Search, Filter, ArrowLeft, Eye, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EmployeeProfileManager from "@/components/staff/EmployeeProfileManager";
import HRAnalyticsCharts from "@/components/staff/HRAnalyticsCharts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StaffLayout from "@/components/staff/StaffLayout";
import { checkAttendanceViolations, issueWarning, type AttendanceViolation } from "@/lib/hr-warnings";
import { ROLE_LABELS, type AppRole } from "@/lib/supabase";
import { format } from "date-fns";
import { toast } from "sonner";
import { isWorkingDay } from "@/lib/ethiopian-holidays";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function HRSystemPage() {
  const { user, isCeo, roles } = useAuth();
  const isHR = roles.includes("hr");
  const canAccess = isCeo || isHR;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [drillDownType, setDrillDownType] = useState<string | null>(null);

  // Data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, AppRole[]>>({});
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [approvedLeavesToday, setApprovedLeavesToday] = useState<any[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [violations, setViolations] = useState<AttendanceViolation[]>([]);
  const [performanceScores, setPerformanceScores] = useState<any[]>([]);
  const [employeeProfiles, setEmployeeProfiles] = useState<any[]>([]);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [letters, setLetters] = useState<any[]>([]);

  useEffect(() => {
    if (canAccess) loadAll();
  }, [canAccess]);

  const loadAll = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const monthKey = format(new Date(), "yyyy-MM");

    const [
      profilesRes, rolesRes, attendRes, leavesRes, approvedLeavesRes,
      paymentsRes, appsRes, vacRes, warningsRes, scoresRes,
      empProfilesRes, qualsRes, lettersRes
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("attendance").select("*").gte("clock_in", today + "T00:00:00"),
      supabase.from("leave_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("leave_requests").select("*").eq("status", "approved").lte("start_date", today).gte("end_date", today),
      supabase.from("salary_payments").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("job_applications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("job_vacancies").select("*").order("created_at", { ascending: false }),
      supabase.from("hr_warnings").select("*").eq("month", monthKey).order("created_at", { ascending: false }),
      supabase.from("performance_scores").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("employee_profiles").select("*"),
      supabase.from("employee_qualifications").select("*"),
      supabase.from("experience_letters").select("*").order("created_at", { ascending: false }),
    ]);

    const roleMap: Record<string, AppRole[]> = {};
    for (const r of rolesRes.data || []) {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role as AppRole);
    }

    setProfiles(profilesRes.data || []);
    setUserRoles(roleMap);
    setAttendanceToday(attendRes.data || []);
    setLeaveRequests(leavesRes.data || []);
    setApprovedLeavesToday(approvedLeavesRes.data || []);
    setSalaryPayments(paymentsRes.data || []);
    setApplications(appsRes.data || []);
    setVacancies(vacRes.data || []);
    setWarnings(warningsRes.data || []);
    setPerformanceScores(scoresRes.data || []);
    setEmployeeProfiles(empProfilesRes.data || []);
    setQualifications(qualsRes.data || []);
    setLetters(lettersRes.data || []);

    try {
      const v = await checkAttendanceViolations(new Date());
      setViolations(v);
    } catch { /* ignore */ }

    setLoading(false);
  };

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach((p) => (m[p.user_id] = p));
    return m;
  }, [profiles]);

  const staffProfiles = useMemo(() => profiles.filter(p => userRoles[p.user_id]?.length > 0), [profiles, userRoles]);
  const staffCount = staffProfiles.length;
  
  // UNIQUE present count - deduplicate by user_id
  const uniquePresentIds = useMemo(() => {
    const ids = new Set<string>();
    attendanceToday.forEach(a => ids.add(a.user_id));
    return ids;
  }, [attendanceToday]);
  const presentToday = uniquePresentIds.size;

  // On leave today
  const onLeaveIds = useMemo(() => {
    const ids = new Set<string>();
    approvedLeavesToday.forEach(l => ids.add(l.user_id));
    return ids;
  }, [approvedLeavesToday]);

  // Absent today - staff who didn't check in AND don't have approved leave, only on working days
  const absentStaff = useMemo(() => {
    const todayDate = new Date();
    if (!isWorkingDay(todayDate)) return [];
    return staffProfiles.filter(p => 
      !uniquePresentIds.has(p.user_id) && !onLeaveIds.has(p.user_id)
    );
  }, [staffProfiles, uniquePresentIds, onLeaveIds]);
  const absentToday = absentStaff.length;

  const pendingLeaves = leaveRequests.length;
  const openVacancies = vacancies.filter((v) => v.status === "published").length;
  const pendingApps = applications.filter((a) => a.status === "new" || a.status === "reviewing").length;
  const draftPayments = salaryPayments.filter((p) => p.status === "draft").length;
  const activeWarnings = warnings.filter((w) => !w.acknowledged).length;

  const handleIssueWarning = async (violation: AttendanceViolation) => {
    if (!user) return;
    try {
      await issueWarning(violation, user.id);
      toast.success(`Warning issued to ${violation.staffName}`);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleKPIClick = (type: string) => {
    setDrillDownType(type);
  };

  // Drill-down list data
  const drillDownData = useMemo(() => {
    if (!drillDownType) return [];
    switch (drillDownType) {
      case "staff": return staffProfiles.map(p => ({ id: p.user_id, name: p.full_name, detail: p.position || "—", extra: (userRoles[p.user_id] || []).map(r => ROLE_LABELS[r] || r).join(", ") }));
      case "present": {
        // Show unique staff who checked in
        const shown = new Set<string>();
        return attendanceToday.filter(a => {
          if (shown.has(a.user_id)) return false;
          shown.add(a.user_id);
          return true;
        }).map(a => ({ id: a.user_id, name: profileMap[a.user_id]?.full_name || "Unknown", detail: `In: ${a.clock_in ? format(new Date(a.clock_in), "HH:mm") : "—"}`, extra: a.is_late ? "Late" : "On time" }));
      }
      case "absent": {
        return absentStaff.map(p => ({ id: p.user_id, name: p.full_name, detail: p.position || "—", extra: "Unjustified Absence" }));
      }
      case "leaves": return leaveRequests.map(lr => ({ id: lr.user_id, name: profileMap[lr.user_id]?.full_name || "Unknown", detail: `${lr.leave_type}: ${lr.start_date} - ${lr.end_date}`, extra: lr.status }));
      case "vacancies": return vacancies.filter(v => v.status === "published").map(v => ({ id: v.id, name: v.title, detail: `${v.department || "—"} · ${v.employment_type}`, extra: `${v.openings} opening(s)` }));
      case "applications": return applications.filter(a => a.status === "new" || a.status === "reviewing").map(a => ({ id: a.id, name: a.applicant_name, detail: a.position || "General", extra: a.status }));
      case "salary": return salaryPayments.filter(p => p.status === "draft").map(p => ({ id: p.id, name: profileMap[p.staff_id]?.full_name || "Unknown", detail: `${p.period_start} → ${p.period_end}`, extra: `${Number(p.net_salary).toLocaleString()} ETB` }));
      case "warnings": return warnings.filter(w => !w.acknowledged).map(w => ({ id: w.id, name: profileMap[w.staff_id]?.full_name || "Unknown", detail: w.warning_type.replace(/_/g, " "), extra: `Level ${w.warning_level}` }));
      default: return [];
    }
  }, [drillDownType, staffProfiles, attendanceToday, absentStaff, leaveRequests, vacancies, applications, salaryPayments, warnings, profileMap, userRoles]);

  const drillDownTitle: Record<string, string> = {
    staff: "All Staff Members", present: "Present Today", absent: "Absent Today", leaves: "Pending Leaves",
    vacancies: "Open Vacancies", applications: "New Applications", salary: "Unpaid Salaries", warnings: "Active Warnings"
  };

  if (!canAccess) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Access Restricted</h2>
            <p className="text-muted-foreground">Only CEO and HR personnel can access the HR System.</p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  const kpiCards = [
    { key: "staff", label: "Total Staff", value: staffCount, icon: Users, color: "text-primary" },
    { key: "present", label: "Present Today", value: presentToday, icon: UserCheck, color: "text-green-600" },
    { key: "absent", label: "Absent Today", value: absentToday, icon: UserX, color: "text-destructive" },
    { key: "leaves", label: "Pending Leaves", value: pendingLeaves, icon: Calendar, color: "text-amber-600" },
    { key: "vacancies", label: "Open Vacancies", value: openVacancies, icon: Briefcase, color: "text-blue-600" },
    { key: "applications", label: "New Applications", value: pendingApps, icon: FileText, color: "text-purple-600" },
    { key: "salary", label: "Unpaid Salaries", value: draftPayments, icon: DollarSign, color: "text-orange-600" },
    { key: "warnings", label: "Active Warnings", value: activeWarnings, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <StaffLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              HR Management System
            </h1>
            <p className="text-muted-foreground text-sm">Centralized HR dashboard — all employee data in one place</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          </div>
        </div>

        {/* KPI Cards — Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpiCards.map((stat, i) => (
            <motion.div key={stat.key} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:ring-2 hover:ring-primary/30" onClick={() => handleKPIClick(stat.key)}>
                <CardContent className="p-3 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* KPI Drill-Down Dialog */}
        <Dialog open={!!drillDownType} onOpenChange={(open) => !open && setDrillDownType(null)}>
          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{drillDownTitle[drillDownType || ""] || "Details"}</DialogTitle>
            </DialogHeader>
            {drillDownData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No records found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Info</TableHead>
                    {(drillDownType === "staff" || drillDownType === "present" || drillDownType === "absent") && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.detail}</TableCell>
                      <TableCell><Badge variant={item.extra === "Unjustified Absence" ? "destructive" : "outline"} className="text-xs">{item.extra}</Badge></TableCell>
                      {(drillDownType === "staff" || drillDownType === "present" || drillDownType === "absent") && (
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => { setDrillDownType(null); setSelectedStaffId(item.id); setActiveTab("employee_profiles"); }}>
                            <Eye className="w-3.5 h-3.5 mr-1" />Profile
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="employee_profiles">Employee Profiles</TabsTrigger>
            <TabsTrigger value="staff">Staff Directory</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
            <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
            <TabsTrigger value="salary">Payroll</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ChevronRight className="w-4 h-4" />Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Manage Users", to: "/staff/admin/users", icon: Users },
                    { label: "Salary Management", to: "/staff/salary", icon: DollarSign },
                    { label: "Attendance Reports", to: "/staff/attendance", icon: Clock },
                    { label: "Job Vacancies", to: "/staff/vacancies", icon: Briefcase },
                    { label: "Applications", to: "/staff/applications", icon: FileText },
                    { label: "Performance", to: "/staff/performance", icon: TrendingUp },
                  ].map((link) => (
                    <Link key={link.to} to={link.to} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                      <link.icon className="w-4 h-4 text-primary" /><span>{link.label}</span><ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Pending Leave Requests</CardTitle></CardHeader>
                <CardContent>
                  {leaveRequests.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests</p> : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {leaveRequests.slice(0, 5).map((lr: any) => (
                        <div key={lr.id} className="flex items-center justify-between text-sm border-b pb-1">
                          <div><span className="font-medium">{profileMap[lr.user_id]?.full_name || "Unknown"}</span><span className="text-muted-foreground ml-2">{lr.leave_type}</span></div>
                          <Badge variant="outline">{lr.start_date} - {lr.end_date}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Recent Warnings</CardTitle></CardHeader>
                <CardContent>
                  {warnings.length === 0 ? <p className="text-sm text-muted-foreground">No warnings this month</p> : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {warnings.slice(0, 5).map((w: any) => (
                        <div key={w.id} className="flex items-center gap-2 text-sm border-b pb-1">
                          <Badge variant={w.warning_type === "termination" ? "destructive" : "outline"} className="text-xs">L{w.warning_level}</Badge>
                          <span className="font-medium">{profileMap[w.staff_id]?.full_name || "Unknown"}</span>
                          <span className="text-muted-foreground text-xs ml-auto">{w.warning_type.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Absent Today Section */}
            {absentStaff.length > 0 && isWorkingDay(new Date()) && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <UserX className="w-4 h-4" />Absent Today ({absentStaff.length} staff without check-in or approved leave)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {absentStaff.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-lg border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                        onClick={() => { setSelectedStaffId(p.user_id); setActiveTab("employee_profiles"); }}>
                        <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-destructive text-xs font-bold">
                          {p.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{p.full_name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.position || "Staff"}</div>
                        </div>
                        <Badge variant="destructive" className="text-[10px]">Absent</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4" />Recruitment Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {["new", "reviewing", "shortlisted", "interview", "hired"].map((status) => {
                    const count = applications.filter((a) => a.status === status).length;
                    return (
                      <div key={status} className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs text-muted-foreground capitalize">{status}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <HRAnalyticsCharts
              profiles={profiles}
              userRoles={userRoles}
              employeeProfiles={employeeProfiles}
              qualifications={qualifications}
              letters={letters}
              attendance={attendanceToday}
            />
          </TabsContent>

          {/* Employee Profiles */}
          <TabsContent value="employee_profiles" className="space-y-4">
            {selectedStaffId ? (
              <div>
                <Button variant="ghost" size="sm" className="mb-3" onClick={() => setSelectedStaffId(null)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Staff List
                </Button>
                <EmployeeProfileManager staffUserId={selectedStaffId} />
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Select an employee to manage their profile, qualifications, and experience letters</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.filter((p) => {
                        const pRoles = userRoles[p.user_id] || [];
                        if (pRoles.length === 0) return false;
                        if (!search) return true;
                        const s = search.toLowerCase();
                        return p.full_name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s);
                      }).map((p) => {
                        const pRoles = userRoles[p.user_id] || [];
                        return (
                          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedStaffId(p.user_id)}>
                            <TableCell className="font-medium">{p.full_name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{p.position || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{p.email}</TableCell>
                            <TableCell>{pRoles.slice(0, 2).map(r => <Badge key={r} variant="secondary" className="text-xs mr-1">{ROLE_LABELS[r] || r}</Badge>)}</TableCell>
                            <TableCell><Button size="sm" variant="outline"><Eye className="w-3.5 h-3.5 mr-1" />View</Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Staff Directory */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role(s)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.filter(p => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())).map((p) => {
                      const pRoles = userRoles[p.user_id] || [];
                      const isPresent = uniquePresentIds.has(p.user_id);
                      const isOnLeave = onLeaveIds.has(p.user_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.position || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{p.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {pRoles.map(r => <Badge key={r} variant="secondary" className="text-xs">{ROLE_LABELS[r] || r}</Badge>)}
                              {pRoles.length === 0 && <span className="text-xs text-muted-foreground">Applicant</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {pRoles.length > 0 ? (
                              isPresent ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Present</Badge> :
                              isOnLeave ? <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">On Leave</Badge> :
                              <Badge variant="destructive" className="text-xs">Absent</Badge>
                            ) : <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: UserCheck, color: "text-green-600", value: presentToday, label: "Present Today" },
                { icon: UserX, color: "text-destructive", value: absentToday, label: "Absent Today" },
                { icon: Calendar, color: "text-amber-600", value: onLeaveIds.size, label: "On Leave" },
                { icon: Calendar, color: "text-blue-600", value: pendingLeaves, label: "Pending Leaves" },
              ].map(s => (
                <Card key={s.label}><CardContent className="p-4 text-center"><s.icon className={`w-8 h-8 mx-auto mb-2 ${s.color}`} /><div className="text-3xl font-bold">{s.value}</div><div className="text-sm text-muted-foreground">{s.label}</div></CardContent></Card>
              ))}
            </div>

            {/* Absent Today Detail */}
            {absentStaff.length > 0 && isWorkingDay(new Date()) && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />Absent Today - No Check-in & No Approved Leave
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Position</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {absentStaff.map(p => (
                        <TableRow key={p.user_id}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.position || "—"}</TableCell>
                          <TableCell><Badge variant="destructive" className="text-xs">Unjustified Absence</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStaffId(p.user_id); setActiveTab("employee_profiles"); }}>
                              <Eye className="w-3.5 h-3.5 mr-1" />View Profile
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm">Today's Attendance (Unique Staff)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>First In</TableHead><TableHead>Last Out</TableHead><TableHead>Sessions</TableHead><TableHead>Total Hours</TableHead><TableHead>Late</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(() => {
                      // Group attendance by user_id
                      const byUser: Record<string, any[]> = {};
                      attendanceToday.forEach((a: any) => {
                        if (!byUser[a.user_id]) byUser[a.user_id] = [];
                        byUser[a.user_id].push(a);
                      });
                      return Object.entries(byUser).map(([userId, records]) => {
                        const sorted = records.sort((a: any, b: any) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
                        const firstIn = sorted[0]?.clock_in;
                        const lastOut = sorted[sorted.length - 1]?.clock_out;
                        const totalHours = sorted.reduce((sum: number, r: any) => sum + (Number(r.work_hours) || 0), 0);
                        const isLate = sorted[0]?.is_late;
                        return (
                          <TableRow key={userId}>
                            <TableCell className="font-medium">{profileMap[userId]?.full_name || "Unknown"}</TableCell>
                            <TableCell>{firstIn ? format(new Date(firstIn), "HH:mm") : "—"}</TableCell>
                            <TableCell>{lastOut ? format(new Date(lastOut), "HH:mm") : <Badge variant="outline" className="text-xs">Active</Badge>}</TableCell>
                            <TableCell>{sorted.length}</TableCell>
                            <TableCell>{totalHours > 0 ? totalHours.toFixed(1) + "h" : "—"}</TableCell>
                            <TableCell>{isLate ? <Badge variant="destructive" className="text-xs">Late</Badge> : <CheckCircle className="w-4 h-4 text-green-600" />}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                    {attendanceToday.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No attendance records today</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warnings */}
          <TabsContent value="warnings" className="space-y-4">
            {violations.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="w-4 h-4" />Detected Violations</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Lates</TableHead><TableHead>Absences</TableHead><TableHead>Type</TableHead><TableHead>Level</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {violations.map(v => (
                        <TableRow key={v.staffId}>
                          <TableCell className="font-medium">{v.staffName}</TableCell>
                          <TableCell>{v.lateCount}</TableCell>
                          <TableCell>{v.absenceCount}</TableCell>
                          <TableCell><Badge variant={v.warningType === "termination" ? "destructive" : "outline"} className="text-xs">{v.warningType.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>L{v.warningLevel}</TableCell>
                          <TableCell><Button size="sm" variant="destructive" onClick={() => handleIssueWarning(v)}>Issue Warning</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Warning History (This Month)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Type</TableHead><TableHead>Level</TableHead><TableHead>Lates</TableHead><TableHead>Absences</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {warnings.map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{profileMap[w.staff_id]?.full_name || "Unknown"}</TableCell>
                        <TableCell><Badge variant={w.warning_type === "termination" ? "destructive" : "outline"} className="text-xs capitalize">{w.warning_type.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>L{w.warning_level}</TableCell>
                        <TableCell>{w.late_count}</TableCell>
                        <TableCell>{w.absence_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{w.action_taken}</TableCell>
                        <TableCell>{w.acknowledged ? <Badge className="bg-green-100 text-green-700 text-xs">Acknowledged</Badge> : <Badge variant="outline" className="text-xs">Pending</Badge>}</TableCell>
                      </TableRow>
                    ))}
                    {warnings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No warnings this month</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recruitment */}
          <TabsContent value="recruitment" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4" />Open Vacancies ({openVacancies})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {vacancies.filter(v => v.status === "published").map((v: any) => (
                      <div key={v.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                        <div><span className="font-medium text-sm">{v.title}</span><div className="text-xs text-muted-foreground">{v.department} · {v.employment_type}</div></div>
                        <Badge variant="outline" className="text-xs">{v.openings} opening{v.openings > 1 ? "s" : ""}</Badge>
                      </div>
                    ))}
                    {openVacancies === 0 && <p className="text-sm text-muted-foreground">No open vacancies</p>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Recent Applications ({applications.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {applications.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                        <div><span className="font-medium text-sm">{a.applicant_name}</span><div className="text-xs text-muted-foreground">{a.position || "General"}</div></div>
                        <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                      </div>
                    ))}
                    {applications.length === 0 && <p className="text-sm text-muted-foreground">No applications</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Salary */}
          <TabsContent value="salary" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" />Recent Payment Records</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {salaryPayments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{profileMap[p.staff_id]?.full_name || "Unknown"}</TableCell>
                        <TableCell className="text-xs">{p.period_start} → {p.period_end}</TableCell>
                        <TableCell>{Number(p.gross_salary).toLocaleString()} ETB</TableCell>
                        <TableCell className="font-medium">{Number(p.net_salary).toLocaleString()} ETB</TableCell>
                        <TableCell><Badge variant={p.status === "paid" ? "default" : p.status === "approved" ? "secondary" : "outline"} className="text-xs capitalize">{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {salaryPayments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No payment records</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />Performance Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staffProfiles.slice(0, 15).map(p => {
                    const staffScores = performanceScores.filter((s: any) => s.staff_id === p.user_id);
                    const totalPoints = staffScores.reduce((sum: number, s: any) => sum + (s.points || 0), 0);
                    return (
                      <div key={p.user_id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1" onClick={() => { setSelectedStaffId(p.user_id); setActiveTab("employee_profiles"); }}>
                        <span className="text-sm font-medium w-40 truncate">{p.full_name}</span>
                        <Progress value={Math.min(100, totalPoints)} className="flex-1" />
                        <span className="text-sm font-bold w-16 text-right">{totalPoints} pts</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
