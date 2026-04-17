import { supabase } from "@/integrations/supabase/client";
import { isWorkingDay } from "@/lib/ethiopian-holidays";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export interface AttendanceViolation {
  staffId: string;
  staffName: string;
  month: string;
  lateCount: number;
  absenceCount: number;
  warningLevel: number;
  warningType: string;
  actionRequired: string;
}

const LATE_THRESHOLD = 3; // 3 lates per month
const ABSENCE_THRESHOLD = 2; // 2 unexcused absences per month

export async function checkAttendanceViolations(monthDate: Date): Promise<AttendanceViolation[]> {
  const monthKey = format(monthDate, "yyyy-MM");
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

  // Get all staff profiles
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
  if (!profiles?.length) return [];

  // Get all attendance for the month
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .gte("clock_in", monthStart + "T00:00:00")
    .lte("clock_in", monthEnd + "T23:59:59");

  // Get approved leaves for the month
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("status", "approved")
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart);

  // Get existing warnings for this month
  const { data: existingWarnings } = await supabase
    .from("hr_warnings")
    .select("*")
    .eq("month", monthKey);

  const violations: AttendanceViolation[] = [];
  const workingDays = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: new Date() < endOfMonth(monthDate) ? new Date() : endOfMonth(monthDate),
  }).filter((d) => isWorkingDay(d));

  for (const profile of profiles) {
    const staffAttendance = (attendance || []).filter((a: any) => a.user_id === profile.user_id);
    const staffLeaves = (leaves || []).filter((l: any) => l.user_id === profile.user_id);

    // Count lates
    const lateCount = staffAttendance.filter((a: any) => a.is_late).length;

    // Count unexcused absences
    let absenceCount = 0;
    for (const day of workingDays) {
      const dateStr = format(day, "yyyy-MM-dd");
      const hasAttendance = staffAttendance.some((a: any) =>
        a.clock_in?.startsWith(dateStr)
      );
      const hasLeave = staffLeaves.some((l: any) =>
        dateStr >= l.start_date && dateStr <= l.end_date
      );
      if (!hasAttendance && !hasLeave) absenceCount++;
    }

    // Determine warning level
    const hasExistingWarning = (existingWarnings || []).find(
      (w: any) => w.staff_id === profile.user_id
    );
    const existingLevel = hasExistingWarning?.warning_level || 0;

    let warningType = "";
    let warningLevel = 0;
    let actionRequired = "";

    if (lateCount >= LATE_THRESHOLD && absenceCount >= ABSENCE_THRESHOLD) {
      warningLevel = Math.min(existingLevel + 1, 3);
      if (warningLevel >= 3) {
        warningType = "termination";
        actionRequired = "HR review, possible termination, automatic access revocation";
      } else {
        warningType = "final_warning";
        actionRequired = "Final warning letter, HR review scheduled";
      }
    } else if (absenceCount >= ABSENCE_THRESHOLD) {
      warningLevel = Math.min(existingLevel + 1, 2);
      warningType = "absence_warning";
      actionRequired = "Automatic warning letter for unexcused absences";
    } else if (lateCount >= LATE_THRESHOLD) {
      warningLevel = Math.min(existingLevel + 1, 1);
      warningType = "late_warning";
      actionRequired = "Warning notification for repeated lateness";
    }

    if (warningType) {
      violations.push({
        staffId: profile.user_id,
        staffName: profile.full_name,
        month: monthKey,
        lateCount,
        absenceCount,
        warningLevel,
        warningType,
        actionRequired,
      });
    }
  }

  return violations;
}

export async function issueWarning(violation: AttendanceViolation, issuedBy: string) {
  // Insert HR warning record
  const { error } = await supabase.from("hr_warnings").insert({
    staff_id: violation.staffId,
    warning_type: violation.warningType,
    warning_level: violation.warningLevel,
    month: violation.month,
    late_count: violation.lateCount,
    absence_count: violation.absenceCount,
    description: `${violation.warningType === "late_warning" ? `${violation.lateCount} late arrivals` : ""}${violation.warningType === "absence_warning" ? `${violation.absenceCount} unexcused absences` : ""}${violation.warningType === "final_warning" ? `${violation.lateCount} lates + ${violation.absenceCount} absences` : ""}${violation.warningType === "termination" ? `Exceeded all thresholds: ${violation.lateCount} lates, ${violation.absenceCount} absences` : ""}`,
    action_taken: violation.actionRequired,
    issued_by: issuedBy,
  } as any);

  if (error) throw error;

  // Send notification to the staff member
  await supabase.from("notifications").insert({
    user_id: violation.staffId,
    type: "hr_warning",
    title: `HR Warning: ${violation.warningType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
    message: `You have received a level ${violation.warningLevel} warning for ${violation.month}. ${violation.actionRequired}`,
    related_id: violation.staffId,
  });

  // If termination, also notify CEO and HR
  if (violation.warningType === "termination") {
    const { data: executives } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["ceo", "hr"]);

    for (const exec of executives || []) {
      await supabase.from("notifications").insert({
        user_id: exec.user_id,
        type: "hr_termination",
        title: `Termination Review Required: ${violation.staffName}`,
        message: `${violation.staffName} has exceeded attendance thresholds (${violation.lateCount} lates, ${violation.absenceCount} absences) in ${violation.month}. Action required.`,
        related_id: violation.staffId,
      });
    }
  }
}
