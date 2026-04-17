import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, getISOWeek } from "date-fns";

export const getWeekKey = (date: Date) => `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, "0")}`;
export const getMonthKey = (date: Date) => format(date, "yyyy-MM");
export const getQuarterKey = (date: Date) => `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
export const getDayKey = (date: Date) => format(date, "yyyy-MM-dd");

export async function recalculateWeeklyPerformance(staffId: string, weekDate: Date) {
  const weekKey = getWeekKey(weekDate);
  const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: dailyRecords } = await supabase
    .from("plan_performance_records")
    .select("grade, flagged")
    .eq("staff_id", staffId)
    .eq("plan_type", "daily")
    .gte("period_key", weekStart)
    .lte("period_key", weekEnd);

  if (!dailyRecords || dailyRecords.length === 0) return;

  const avgGrade = dailyRecords.reduce((sum, r) => sum + Number(r.grade), 0) / dailyRecords.length;
  const flaggedCount = dailyRecords.filter((r) => r.flagged).length;

  await supabase.from("performance_summaries").upsert({
    staff_id: staffId,
    period_type: "weekly",
    period_key: weekKey,
    average_grade: Math.round(avgGrade * 10) / 10,
    total_plans: dailyRecords.length,
    flagged_count: flaggedCount,
    status: "auto",
  }, { onConflict: "staff_id,period_type,period_key" });
}

export async function recalculateMonthlyPerformance(staffId: string, monthDate: Date) {
  const monthKey = getMonthKey(monthDate);

  // Get all weekly summaries for this month
  const { data: weeklySummaries } = await supabase
    .from("performance_summaries")
    .select("average_grade, flagged_count")
    .eq("staff_id", staffId)
    .eq("period_type", "weekly")
    .like("period_key", `${monthDate.getFullYear()}-W%`);

  // Filter to weeks that fall within this month
  if (!weeklySummaries || weeklySummaries.length === 0) return;

  const avgGrade = weeklySummaries.reduce((sum, r) => sum + Number(r.average_grade), 0) / weeklySummaries.length;
  const flaggedCount = weeklySummaries.reduce((sum, r) => sum + r.flagged_count, 0);

  await supabase.from("performance_summaries").upsert({
    staff_id: staffId,
    period_type: "monthly",
    period_key: monthKey,
    average_grade: Math.round(avgGrade * 10) / 10,
    total_plans: weeklySummaries.length,
    flagged_count: flaggedCount,
    status: "auto",
  }, { onConflict: "staff_id,period_type,period_key" });
}

export async function recalculateQuarterlyPerformance(staffId: string, quarterDate: Date) {
  const quarterKey = getQuarterKey(quarterDate);
  const quarter = Math.ceil((quarterDate.getMonth() + 1) / 3);
  const year = quarterDate.getFullYear();
  const monthKeys = Array.from({ length: 3 }, (_, i) => {
    const m = (quarter - 1) * 3 + i + 1;
    return `${year}-${String(m).padStart(2, "0")}`;
  });

  const { data: monthlySummaries } = await supabase
    .from("performance_summaries")
    .select("average_grade, flagged_count")
    .eq("staff_id", staffId)
    .eq("period_type", "monthly")
    .in("period_key", monthKeys);

  if (!monthlySummaries || monthlySummaries.length === 0) return;

  const avgGrade = monthlySummaries.reduce((sum, r) => sum + Number(r.average_grade), 0) / monthlySummaries.length;
  const flaggedCount = monthlySummaries.reduce((sum, r) => sum + r.flagged_count, 0);

  await supabase.from("performance_summaries").upsert({
    staff_id: staffId,
    period_type: "quarterly",
    period_key: quarterKey,
    average_grade: Math.round(avgGrade * 10) / 10,
    total_plans: monthlySummaries.length,
    flagged_count: flaggedCount,
    status: "auto",
  }, { onConflict: "staff_id,period_type,period_key" });
}

export async function recordPlanPerformance(
  staffId: string,
  planId: string,
  planType: string,
  plannedValue: number,
  actualValue: number,
) {
  const now = new Date();
  const periodKey = getDayKey(now);

  await supabase.from("plan_performance_records").upsert({
    staff_id: staffId,
    plan_id: planId,
    plan_type: planType,
    period_key: periodKey,
    planned_value: plannedValue,
    actual_value: actualValue,
  }, { onConflict: "staff_id,plan_id" });

  // Auto-recalculate aggregates
  await recalculateWeeklyPerformance(staffId, now);
  await recalculateMonthlyPerformance(staffId, now);
  await recalculateQuarterlyPerformance(staffId, now);
}

export async function findQuarterlyWinner(quarterDate: Date) {
  const quarterKey = getQuarterKey(quarterDate);

  const { data: summaries } = await supabase
    .from("performance_summaries")
    .select("staff_id, average_grade")
    .eq("period_type", "quarterly")
    .eq("period_key", quarterKey)
    .order("average_grade", { ascending: false })
    .limit(1);

  if (summaries && summaries.length > 0) {
    return summaries[0];
  }
  return null;
}
