import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";
import { isWorkingDay, isSaturday, isEthiopianHoliday, getExpectedHours } from "./ethiopian-holidays";

/**
 * Weighted Performance Scoring
 * Plans: 25%, Projects: 25%, Tickets: 25%, Attendance: 25%
 * Integrates Ethiopian holidays and unjustified absence penalties
 */

export interface WeightedScore {
  plansScore: number;       // 0-100
  projectsScore: number;    // 0-100
  ticketsScore: number;     // 0-100
  attendanceScore: number;  // 0-100
  overallScore: number;     // weighted average
  breakdown: {
    plans: { completed: number; total: number; avgGrade: number };
    projects: { tasksCompleted: number; totalTasks: number };
    tickets: { resolved: number; total: number };
    attendance: { daysPresent: number; workingDays: number; avgHours: number };
  };
}

export async function calculateWeightedPerformance(
  staffId: string,
  monthDate: Date
): Promise<WeightedScore> {
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const monthStartTs = startOfMonth(monthDate).toISOString();
  const monthEndTs = endOfMonth(monthDate).toISOString();

  // Fetch all data in parallel
  const [plansRes, perfRecordsRes, projectTasksRes, ticketsRes, attendanceRes] = await Promise.all([
    // Plans submitted this month
    supabase
      .from("plans")
      .select("id, plan_type")
      .eq("author_id", staffId)
      .gte("created_at", monthStartTs)
      .lte("created_at", monthEndTs),

    // Performance records for grading
    supabase
      .from("plan_performance_records")
      .select("grade, status, achievement_pct")
      .eq("staff_id", staffId)
      .gte("period_key", monthStart)
      .lte("period_key", monthEnd),

    // Project tasks assigned to this staff
    supabase
      .from("project_tasks")
      .select("id, status")
      .eq("assigned_to", staffId)
      .gte("created_at", monthStartTs)
      .lte("created_at", monthEndTs),

    // Support tickets assigned/created
    supabase
      .from("support_tickets")
      .select("id, status, assigned_to, created_by")
      .or(`assigned_to.eq.${staffId},created_by.eq.${staffId}`)
      .gte("created_at", monthStartTs)
      .lte("created_at", monthEndTs),

    // Attendance records
    supabase
      .from("attendance")
      .select("clock_in, clock_out, work_hours")
      .eq("user_id", staffId)
      .gte("clock_in", monthStartTs)
      .lte("clock_in", monthEndTs),
  ]);

  // --- PLANS SCORE (25%) ---
  const plans = plansRes.data || [];
  const perfRecords = perfRecordsRes.data || [];
  const approvedRecords = perfRecords.filter((r) => r.status === "approved");
  const avgGrade = approvedRecords.length > 0
    ? approvedRecords.reduce((sum, r) => sum + Number(r.grade), 0) / approvedRecords.length
    : (perfRecords.length > 0 ? perfRecords.reduce((sum, r) => sum + Number(r.grade), 0) / perfRecords.length : 0);
  const plansScore = plans.length > 0 ? Math.min(100, avgGrade) : 0;

  // --- PROJECTS SCORE (25%) ---
  const projectTasks = projectTasksRes.data || [];
  const completedTasks = projectTasks.filter((t) => t.status === "done" || t.status === "completed");
  const projectsScore = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 100; // No tasks = full score (not penalized)

  // --- TICKETS SCORE (25%) ---
  const tickets = ticketsRes.data || [];
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const ticketsScore = tickets.length > 0
    ? Math.round((resolvedTickets.length / tickets.length) * 100)
    : 100; // No tickets = full score

  // --- ATTENDANCE SCORE (25%) --- (uses Ethiopian holidays)
  const attendanceRecords = attendanceRes.data || [];
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const today = new Date();
  const effectiveEnd = end > today ? today : end;
  
  // Calculate working days excluding Ethiopian holidays
  const allDays = eachDayOfInterval({ start, end: effectiveEnd });
  let workingDays = 0;
  for (const day of allDays) {
    const expected = getExpectedHours(day);
    if (expected > 0) workingDays++;
  }
  
  // Count unique days present
  const presentDates = new Set<string>();
  for (const a of attendanceRecords) {
    presentDates.add(a.clock_in.slice(0, 10));
  }
  const daysPresent = presentDates.size;
  
  // Fetch approved leaves for the month
  const { data: leavesData } = await supabase
    .from("leave_requests")
    .select("start_date, end_date, status")
    .eq("user_id", staffId)
    .eq("status", "approved")
    .lte("start_date", format(end, "yyyy-MM-dd"))
    .gte("end_date", format(start, "yyyy-MM-dd"));
  
  // Count approved leave days
  let approvedLeaveDays = 0;
  for (const leave of (leavesData || [])) {
    const ls = new Date(leave.start_date);
    const le = new Date(leave.end_date);
    const leaveDays = eachDayOfInterval({ start: ls > start ? ls : start, end: le < effectiveEnd ? le : effectiveEnd });
    for (const d of leaveDays) {
      if (getExpectedHours(d) > 0 && !presentDates.has(format(d, "yyyy-MM-dd"))) {
        approvedLeaveDays++;
      }
    }
  }
  
  // Unjustified = working days - present - approved leave
  const unjustifiedDays = Math.max(0, workingDays - daysPresent - approvedLeaveDays);
  
  const avgHours = attendanceRecords.length > 0
    ? attendanceRecords.reduce((sum, r) => sum + Number(r.work_hours || 0), 0) / attendanceRecords.length
    : 0;
  
  // Score: attendance ratio + hours factor, with unjustified penalty (1.5x weight)
  const effectivePresent = daysPresent + approvedLeaveDays;
  const attendanceRatio = workingDays > 0 ? Math.min(1, effectivePresent / workingDays) : 0;
  const hoursFactor = avgHours >= 8 ? 1 : avgHours / 8;
  const unjustifiedPenalty = workingDays > 0 ? (unjustifiedDays / workingDays) * 1.5 : 0;
  const attendanceScore = Math.max(0, Math.round(((attendanceRatio * 0.7) + (hoursFactor * 0.3)) * 100 - unjustifiedPenalty * 100));

  // --- OVERALL WEIGHTED SCORE ---
  const overallScore = Math.round(
    (plansScore * 0.25) +
    (projectsScore * 0.25) +
    (ticketsScore * 0.25) +
    (attendanceScore * 0.25)
  );

  return {
    plansScore,
    projectsScore,
    ticketsScore,
    attendanceScore,
    overallScore,
    breakdown: {
      plans: { completed: approvedRecords.length, total: plans.length, avgGrade: Math.round(avgGrade) },
      projects: { tasksCompleted: completedTasks.length, totalTasks: projectTasks.length },
      tickets: { resolved: resolvedTickets.length, total: tickets.length },
      attendance: { daysPresent, workingDays, avgHours: Math.round(avgHours * 10) / 10 },
    },
  };
}

export async function calculateAllStaffPerformance(monthDate: Date) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, position, avatar_url")
    .order("full_name");

  if (!profiles) return [];

  const results = await Promise.all(
    profiles.map(async (p) => {
      const score = await calculateWeightedPerformance(p.user_id, monthDate);
      return { ...p, ...score };
    })
  );

  return results.sort((a, b) => b.overallScore - a.overallScore);
}
