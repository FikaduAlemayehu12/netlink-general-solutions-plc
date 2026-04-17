/**
 * Absence & Penalty Calculation System
 * 
 * Rules:
 * - Unjustified absence (no approved leave, no attendance) = 3x daily salary deduction
 * - Approved leave types: annual, sick, personal, maternity, paternity = no salary penalty
 * - Unpaid leave = 1x daily salary deduction (normal, no penalty multiplier)
 * - Performance is also penalized for unjustified absences
 */

import { supabase } from "@/integrations/supabase/client";
import { isWorkingDay, isSaturday, isEthiopianHoliday, getExpectedHours } from "./ethiopian-holidays";
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth } from "date-fns";

export interface AbsenceRecord {
  date: string;
  type: "present" | "approved_leave" | "unpaid_leave" | "unjustified";
  leaveType?: string;
  hoursWorked?: number;
  expectedHours: number;
  penaltyMultiplier: number; // 0 = no penalty, 1 = normal deduction, 3 = unjustified penalty
}

export interface MonthlyAbsenceSummary {
  staffId: string;
  month: string; // YYYY-MM
  totalWorkingDays: number;
  daysPresent: number;
  daysApprovedLeave: number;
  daysUnpaidLeave: number;
  daysUnjustified: number;
  totalExpectedHours: number;
  totalWorkedHours: number;
  dailyRate: number; // for penalty calculation
  totalPenaltyDeduction: number;
  performancePenaltyPct: number; // % to deduct from performance score
  records: AbsenceRecord[];
}

export async function calculateMonthlyAbsences(
  staffId: string,
  monthDate: Date,
  dailySalaryRate: number
): Promise<MonthlyAbsenceSummary> {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthKey = format(monthDate, "yyyy-MM");
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Only analyze up to today (don't penalize future days)
  const effectiveEnd = monthEnd > today ? today : monthEnd;

  const days = eachDayOfInterval({ start: monthStart, end: effectiveEnd });

  // Fetch attendance and leave data in parallel
  const [attendanceRes, leaveRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("clock_in, work_hours")
      .eq("user_id", staffId)
      .gte("clock_in", monthStart.toISOString())
      .lte("clock_in", monthEnd.toISOString()),
    supabase
      .from("leave_requests")
      .select("start_date, end_date, leave_type, status")
      .eq("user_id", staffId)
      .eq("status", "approved")
      .lte("start_date", format(monthEnd, "yyyy-MM-dd"))
      .gte("end_date", format(monthStart, "yyyy-MM-dd")),
  ]);

  const attendance = attendanceRes.data || [];
  const leaves = leaveRes.data || [];

  // Build attendance map (date -> hours worked)
  const attendanceMap = new Map<string, number>();
  for (const a of attendance) {
    const dateKey = a.clock_in.slice(0, 10);
    attendanceMap.set(dateKey, (attendanceMap.get(dateKey) || 0) + Number(a.work_hours || 0));
  }

  // Build leave map (date -> leave_type)
  const leaveMap = new Map<string, string>();
  for (const leave of leaves) {
    const leaveStart = parseISO(leave.start_date);
    const leaveEnd = parseISO(leave.end_date);
    const leaveDays = eachDayOfInterval({ start: leaveStart, end: leaveEnd });
    for (const d of leaveDays) {
      leaveMap.set(format(d, "yyyy-MM-dd"), leave.leave_type);
    }
  }

  const records: AbsenceRecord[] = [];
  let totalWorkingDays = 0;
  let daysPresent = 0;
  let daysApprovedLeave = 0;
  let daysUnpaidLeave = 0;
  let daysUnjustified = 0;
  let totalExpectedHours = 0;
  let totalWorkedHours = 0;
  let totalPenaltyDeduction = 0;

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const expectedHours = getExpectedHours(day);

    // Skip non-working days (Sundays, holidays)
    if (expectedHours === 0) continue;

    totalWorkingDays++;
    totalExpectedHours += expectedHours;

    const hoursWorked = attendanceMap.get(dateStr) || 0;
    const leaveType = leaveMap.get(dateStr);

    if (hoursWorked > 0) {
      // Present
      totalWorkedHours += hoursWorked;
      daysPresent++;
      records.push({
        date: dateStr,
        type: "present",
        hoursWorked,
        expectedHours,
        penaltyMultiplier: 0,
      });
    } else if (leaveType) {
      if (leaveType === "unpaid") {
        // Unpaid leave = 1x deduction (normal, no penalty)
        daysUnpaidLeave++;
        const dayRate = isSaturday(day) ? dailySalaryRate * 0.5 : dailySalaryRate;
        totalPenaltyDeduction += dayRate;
        records.push({
          date: dateStr,
          type: "unpaid_leave",
          leaveType,
          expectedHours,
          penaltyMultiplier: 1,
        });
      } else {
        // Approved paid leave (annual, sick, personal, maternity, paternity)
        daysApprovedLeave++;
        records.push({
          date: dateStr,
          type: "approved_leave",
          leaveType,
          expectedHours,
          penaltyMultiplier: 0,
        });
      }
    } else {
      // Unjustified absence = 3x penalty
      daysUnjustified++;
      const dayRate = isSaturday(day) ? dailySalaryRate * 0.5 : dailySalaryRate;
      totalPenaltyDeduction += dayRate * 3;
      records.push({
        date: dateStr,
        type: "unjustified",
        expectedHours,
        penaltyMultiplier: 3,
      });
    }
  }

  // Performance penalty: each unjustified day reduces performance by proportional amount
  const performancePenaltyPct = totalWorkingDays > 0
    ? Math.round((daysUnjustified / totalWorkingDays) * 100 * 1.5) // 1.5x weight on performance
    : 0;

  return {
    staffId,
    month: monthKey,
    totalWorkingDays,
    daysPresent,
    daysApprovedLeave,
    daysUnpaidLeave,
    daysUnjustified,
    totalExpectedHours,
    totalWorkedHours,
    dailyRate: dailySalaryRate,
    totalPenaltyDeduction: Math.round(totalPenaltyDeduction * 100) / 100,
    performancePenaltyPct: Math.min(100, performancePenaltyPct),
    records,
  };
}
