import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, PlaneTakeoff, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StaffStatus {
  userId: string;
  fullName: string;
  position: string | null;
  avatarUrl: string | null;
  status: "present" | "absent" | "on_leave" | "unjustified";
  clockInTime?: string;
  leaveType?: string;
}

interface Props {
  profiles: Record<string, any>;
}

export default function LiveAttendanceIndicators({ profiles }: Props) {
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [todayLeaves, setTodayLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayData();
    // Refresh every 60 seconds
    const interval = setInterval(loadTodayData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTodayData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [attRes, leaveRes] = await Promise.all([
      supabase
        .from("attendance")
        .select("user_id, clock_in, clock_out")
        .gte("clock_in", today + "T00:00:00")
        .lte("clock_in", today + "T23:59:59"),
      supabase
        .from("leave_requests")
        .select("user_id, leave_type, status")
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today),
    ]);
    setTodayAttendance(attRes.data || []);
    setTodayLeaves(leaveRes.data || []);
    setLoading(false);
  };

  const staffStatuses = useMemo((): StaffStatus[] => {
    const profileList = Object.values(profiles);
    // Attendance: who clocked in today
    const clockedInUsers = new Set<string>();
    const activeUsers = new Map<string, string>(); // userId -> clockInTime
    for (const a of todayAttendance) {
      clockedInUsers.add(a.user_id);
      if (!a.clock_out) activeUsers.set(a.user_id, a.clock_in);
      else if (!activeUsers.has(a.user_id)) activeUsers.set(a.user_id, a.clock_in);
    }

    // On leave today
    const onLeaveUsers = new Map<string, string>(); // userId -> leaveType
    for (const l of todayLeaves) {
      onLeaveUsers.set(l.user_id, l.leave_type);
    }

    return profileList.map((p) => {
      const userId = p.user_id;
      if (clockedInUsers.has(userId)) {
        return {
          userId,
          fullName: p.full_name,
          position: p.position,
          avatarUrl: p.avatar_url,
          status: "present" as const,
          clockInTime: activeUsers.get(userId),
        };
      }
      if (onLeaveUsers.has(userId)) {
        return {
          userId,
          fullName: p.full_name,
          position: p.position,
          avatarUrl: p.avatar_url,
          status: "on_leave" as const,
          leaveType: onLeaveUsers.get(userId),
        };
      }
      // Check if today is a working day
      const today = new Date();
      const day = today.getDay();
      if (day === 0) {
        return {
          userId,
          fullName: p.full_name,
          position: p.position,
          avatarUrl: p.avatar_url,
          status: "absent" as const, // Sunday, no penalty indicator
        };
      }
      return {
        userId,
        fullName: p.full_name,
        position: p.position,
        avatarUrl: p.avatar_url,
        status: "unjustified" as const,
      };
    }).sort((a, b) => {
      const order = { present: 0, on_leave: 1, unjustified: 2, absent: 3 };
      return order[a.status] - order[b.status];
    });
  }, [profiles, todayAttendance, todayLeaves]);

  const counts = useMemo(() => {
    return {
      present: staffStatuses.filter(s => s.status === "present").length,
      onLeave: staffStatuses.filter(s => s.status === "on_leave").length,
      unjustified: staffStatuses.filter(s => s.status === "unjustified").length,
      total: staffStatuses.length,
    };
  }, [staffStatuses]);

  if (loading) {
    return <Card><CardContent className="p-4 text-center text-muted-foreground text-sm">Loading live status...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Users className="w-4 h-4" /> Live Staff Status
        </CardTitle>
        <div className="flex gap-3 text-xs mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {counts.present} Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {counts.onLeave} On Leave
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            {counts.unjustified} Absent
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {staffStatuses.map((staff) => (
            <Tooltip key={staff.userId}>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  staff.status === "present"
                    ? "border-green-500/30 bg-green-500/5"
                    : staff.status === "on_leave"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : staff.status === "unjustified"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/30"
                }`}>
                  {/* Status indicator */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      staff.status === "present"
                        ? "bg-green-500/20 text-green-700 dark:text-green-300"
                        : staff.status === "on_leave"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-destructive/20 text-destructive"
                    }`}>
                      {staff.fullName.charAt(0)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                      staff.status === "present"
                        ? "bg-green-500 animate-pulse"
                        : staff.status === "on_leave"
                        ? "bg-amber-500"
                        : "bg-destructive"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{staff.fullName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {staff.status === "present" && "Active"}
                      {staff.status === "on_leave" && `📋 ${staff.leaveType}`}
                      {staff.status === "unjustified" && "⚠️ No record"}
                      {staff.status === "absent" && "Off day"}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{staff.fullName}</div>
                  {staff.position && <div className="text-muted-foreground">{staff.position}</div>}
                  {staff.status === "present" && staff.clockInTime && (
                    <div>Clocked in: {new Date(staff.clockInTime).toLocaleTimeString()}</div>
                  )}
                  {staff.status === "on_leave" && <div>On {staff.leaveType} leave</div>}
                  {staff.status === "unjustified" && (
                    <div className="text-destructive font-semibold">Unjustified absence - 3x salary penalty</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
