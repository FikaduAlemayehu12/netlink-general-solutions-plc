import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Target, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MilestoneWithProject {
  id: string;
  target_percentage: number;
  target_date: string | null;
  status: string;
  group_id: string;
  project_name: string;
  project_end_date: string | null;
}

export default function OverdueMilestonesWidget() {
  const [items, setItems] = useState<MilestoneWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Get overdue or at-risk milestones
    const { data: milestones } = await supabase
      .from("project_milestones")
      .select("id, target_percentage, target_date, status, group_id")
      .in("status", ["pending", "at_risk", "failed"])
      .lte("target_date", today)
      .order("target_date");

    if (!milestones || milestones.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Also get at-risk milestones not yet overdue
    const { data: atRisk } = await supabase
      .from("project_milestones")
      .select("id, target_percentage, target_date, status, group_id")
      .eq("status", "at_risk")
      .gt("target_date", today)
      .order("target_date")
      .limit(5);

    const allMilestones = [...milestones, ...(atRisk || [])];
    const uniqueGroupIds = [...new Set(allMilestones.map((m) => m.group_id))];

    const { data: projects } = await supabase
      .from("project_groups")
      .select("id, name, end_date")
      .in("id", uniqueGroupIds);

    const projectMap = Object.fromEntries((projects || []).map((p) => [p.id, p]));

    const mapped: MilestoneWithProject[] = allMilestones.map((m) => ({
      ...m,
      project_name: projectMap[m.group_id]?.name || "Unknown",
      project_end_date: projectMap[m.group_id]?.end_date || null,
    }));

    // Deduplicate
    const seen = new Set<string>();
    setItems(mapped.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; }).slice(0, 10));
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-destructive" />Overdue & At-Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-1.5">
            <Target className="w-4 h-4 text-primary" />Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">✅ All milestones on track!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Overdue & At-Risk ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((m) => {
          const isOverdue = m.target_date ? new Date(m.target_date) < new Date() && m.status !== "failed" : false;
          return (
            <Link key={m.id} to="/staff/projects" className="block">
              <div className={`p-3 rounded-lg transition-colors hover:bg-muted/80 ${isOverdue ? "bg-destructive/5 border border-destructive/20" : "bg-amber-50 dark:bg-amber-900/10 border border-amber-200/30"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading font-bold text-foreground">{m.project_name}</span>
                    <Badge className={`text-[10px] border-0 ${m.status === "failed" ? "bg-destructive/10 text-destructive" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {m.status === "failed" ? "Failed" : isOverdue ? "Overdue" : "At Risk"}
                    </Badge>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" />{m.target_percentage}% target</span>
                  {m.target_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due {format(new Date(m.target_date), "MMM d")}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
