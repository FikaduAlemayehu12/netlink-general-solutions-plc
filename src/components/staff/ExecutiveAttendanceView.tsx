import { useState, useEffect, useMemo } from "react";
import { Download, Users, Calendar, TrendingUp, ChevronDown, ChevronUp, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildStaffSummaries,
  exportCSV,
  exportExcel,
  exportPDF,
  getWeekKey,
  getMonthKey,
  getQuarterKey,
  type StaffAttendanceSummary,
} from "@/lib/attendance-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  profiles: Record<string, any>;
}

export default function ExecutiveAttendanceView({ profiles }: Props) {
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [periodView, setPeriodView] = useState<"daily" | "weekly" | "monthly" | "quarterly">("daily");

  useEffect(() => {
    loadAllAttendance();
  }, []);

  const loadAllAttendance = async () => {
    setLoading(true);
    // Fetch all attendance (executives have RLS access to all)
    let all: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .order("clock_in", { ascending: false })
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setAllAttendance(all);
    setLoading(false);
  };

  const summaries = useMemo(
    () => buildStaffSummaries(allAttendance, profiles).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [allAttendance, profiles]
  );

  const totalAllHours = summaries.reduce((s, u) => s + u.totalHours, 0);
  const totalAllOvertime = summaries.reduce((s, u) => s + u.totalOvertime, 0);
  const totalAllDays = summaries.reduce((s, u) => s + u.totalDaysWorked, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">Loading all staff attendance...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-heading font-bold text-primary">{summaries.length}</div>
          <div className="text-xs text-muted-foreground">Total Staff</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-heading font-bold text-foreground">{totalAllHours.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">Total Work Hours</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-heading font-bold text-gold">{totalAllOvertime.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">Total Overtime</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-heading font-bold text-accent">{totalAllDays}</div>
          <div className="text-xs text-muted-foreground">Total Days Worked</div>
        </CardContent></Card>
      </div>

      {/* Staff list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Users className="w-4 h-4" /> All Staff Attendance
            </CardTitle>
            <div className="flex gap-1 bg-muted p-0.5 rounded-md">
              {(["daily", "weekly", "monthly", "quarterly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodView(p)}
                  className={`px-3 py-1 rounded text-xs font-heading font-medium transition-colors ${
                    periodView === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {summaries.map((staff) => (
              <StaffRow
                key={staff.userId}
                staff={staff}
                expanded={expandedUser === staff.userId}
                onToggle={() => setExpandedUser(expandedUser === staff.userId ? null : staff.userId)}
                periodView={periodView}
              />
            ))}
            {summaries.length === 0 && (
              <p className="text-center py-6 text-muted-foreground text-sm">No attendance records found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffRow({
  staff,
  expanded,
  onToggle,
  periodView,
}: {
  staff: StaffAttendanceSummary;
  expanded: boolean;
  onToggle: () => void;
  periodView: "daily" | "weekly" | "monthly" | "quarterly";
}) {
  const periodData = useMemo(() => {
    if (periodView === "daily") {
      return Object.entries(staff.dailyHours)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([k, v]) => ({ label: k, hours: v.hours, overtime: v.overtime, extra: `${v.sessions} session${v.sessions > 1 ? "s" : ""}` }));
    }
    if (periodView === "weekly") {
      return Object.entries(staff.weeklyHours)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([k, v]) => ({ label: k, hours: v.hours, overtime: v.overtime, extra: "" }));
    }
    if (periodView === "monthly") {
      return Object.entries(staff.monthlyHours)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([k, v]) => ({ label: k, hours: v.hours, overtime: v.overtime, extra: "" }));
    }
    return Object.entries(staff.quarterlyHours)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([k, v]) => ({ label: k, hours: v.hours, overtime: v.overtime, extra: "" }));
  }, [staff, periodView]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-semibold text-sm text-foreground">{staff.fullName}</span>
            {staff.position && <Badge variant="secondary" className="text-[10px]">{staff.position}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {staff.totalDaysWorked} days · {staff.totalHours.toFixed(1)}h total
            {staff.totalOvertime > 0 && <span className="text-gold"> · +{staff.totalOvertime.toFixed(1)}h OT</span>}
          </div>
        </div>

        {/* Download dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportCSV(staff)}>
              <FileDown className="w-4 h-4 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportExcel(staff)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPDF(staff)}>
              <FileText className="w-4 h-4 mr-2" /> PDF (Print)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-3">
          {/* Period summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-card rounded-md p-2.5 border border-border">
              <div className="text-xs text-muted-foreground font-heading">This Week</div>
              <div className="text-sm font-bold text-foreground">
                {(staff.weeklyHours[getWeekKey(new Date())]?.hours || 0).toFixed(1)}h
              </div>
            </div>
            <div className="bg-card rounded-md p-2.5 border border-border">
              <div className="text-xs text-muted-foreground font-heading">This Month</div>
              <div className="text-sm font-bold text-foreground">
                {(staff.monthlyHours[getMonthKey(new Date())]?.hours || 0).toFixed(1)}h
              </div>
            </div>
            <div className="bg-card rounded-md p-2.5 border border-border">
              <div className="text-xs text-muted-foreground font-heading">This Quarter</div>
              <div className="text-sm font-bold text-foreground">
                {(staff.quarterlyHours[getQuarterKey(new Date())]?.hours || 0).toFixed(1)}h
              </div>
            </div>
            <div className="bg-card rounded-md p-2.5 border border-border">
              <div className="text-xs text-muted-foreground font-heading">Overall Total</div>
              <div className="text-sm font-bold text-primary">{staff.totalHours.toFixed(1)}h</div>
            </div>
          </div>

          {/* Period table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-2 py-1.5">
                    {periodView === "daily" ? "Date" : periodView === "weekly" ? "Week" : periodView === "monthly" ? "Month" : "Quarter"}
                  </th>
                  {periodView === "daily" && <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-2 py-1.5">Sessions</th>}
                  <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-2 py-1.5">Hours</th>
                  <th className="text-left text-xs font-heading font-semibold text-muted-foreground px-2 py-1.5">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periodData.slice(0, 20).map((row) => (
                  <tr key={row.label} className="hover:bg-muted/30">
                    <td className="px-2 py-1.5 text-xs">{row.label}</td>
                    {periodView === "daily" && <td className="px-2 py-1.5 text-xs">{row.extra}</td>}
                    <td className="px-2 py-1.5 text-xs font-semibold">{row.hours.toFixed(1)}h</td>
                    <td className="px-2 py-1.5 text-xs text-gold">{row.overtime > 0 ? `+${row.overtime.toFixed(1)}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {periodData.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">Showing 20 of {periodData.length} — export for full data</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
