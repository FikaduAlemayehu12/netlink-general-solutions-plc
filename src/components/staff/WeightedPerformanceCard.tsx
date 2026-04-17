import { ClipboardList, FolderKanban, Headset, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeightedScore } from "@/lib/weighted-performance";

interface Props {
  score: WeightedScore;
  staffName?: string;
  showBreakdown?: boolean;
}

const COMPONENTS = [
  { key: "plansScore" as const, label: "Plans", icon: ClipboardList, weight: "25%" },
  { key: "projectsScore" as const, label: "Projects", icon: FolderKanban, weight: "25%" },
  { key: "ticketsScore" as const, label: "Tickets", icon: Headset, weight: "25%" },
  { key: "attendanceScore" as const, label: "Attendance", icon: Clock, weight: "25%" },
];

function gradeColor(v: number) {
  if (v >= 80) return "text-green-600";
  if (v >= 60) return "text-amber-600";
  return "text-destructive";
}

function barColor(v: number) {
  if (v >= 80) return "[&>div]:bg-green-500";
  if (v >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-destructive";
}

export default function WeightedPerformanceCard({ score, staffName, showBreakdown = true }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-sm flex items-center justify-between">
          <span>{staffName ? `${staffName} — Weighted Score` : "Weighted Performance"}</span>
          <span className={`text-2xl font-bold ${gradeColor(score.overallScore)}`}>
            {score.overallScore}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {COMPONENTS.map((c) => {
          const val = score[c.key];
          const Icon = c.icon;
          return (
            <div key={c.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" />
                  {c.label}
                  <span className="text-[10px] opacity-60">({c.weight})</span>
                </span>
                <span className={`font-heading font-bold ${gradeColor(val)}`}>{val}%</span>
              </div>
              <Progress value={val} className={`h-2 ${barColor(val)}`} />
            </div>
          );
        })}

        {showBreakdown && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
            <div>Plans: {score.breakdown.plans.completed}/{score.breakdown.plans.total} approved · avg {score.breakdown.plans.avgGrade}%</div>
            <div>Projects: {score.breakdown.projects.tasksCompleted}/{score.breakdown.projects.totalTasks} tasks done</div>
            <div>Tickets: {score.breakdown.tickets.resolved}/{score.breakdown.tickets.total} resolved</div>
            <div>Attendance: {score.breakdown.attendance.daysPresent}/{score.breakdown.attendance.workingDays} days · {score.breakdown.attendance.avgHours}h avg</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
