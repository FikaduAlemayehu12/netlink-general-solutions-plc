import { useState } from "react";
import { CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Shield, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface PlanPerformanceRecord {
  id: string;
  staff_id: string;
  plan_id: string | null;
  plan_type: string;
  period_key: string;
  planned_value: number;
  actual_value: number;
  achievement_pct: number;
  grade: number;
  status: string;
  flagged: boolean;
  ceo_adjusted_grade: number | null;
  ceo_notes: string | null;
  approved_by: string | null;
  staff_name?: string;
  plan_title?: string;
}

interface Props {
  records: PlanPerformanceRecord[];
  onRefresh: () => void;
}

export default function PlanPerformanceTracker({ records, onRefresh }: Props) {
  const { isCeo } = useAuth();
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ grade: "", notes: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  const pendingRecords = records.filter((r) => r.status === "pending");
  const allPendingSelected = pendingRecords.length > 0 && pendingRecords.every((r) => selected.has(r.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingRecords.map((r) => r.id)));
    }
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkApproving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBulkApproving(false); return; }

    const ids = Array.from(selected);
    const { error } = await supabase
      .from("plan_performance_records")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      toast.error("Failed to bulk approve");
    } else {
      toast.success(`${ids.length} record${ids.length > 1 ? "s" : ""} approved`);
      setSelected(new Set());
      onRefresh();
    }
    setBulkApproving(false);
  };

  const approveRecord = async (recordId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("plan_performance_records").update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", recordId);
    toast.success("Performance record approved");
    onRefresh();
  };

  const adjustGrade = async (recordId: string, staffId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !adjustForm.grade) return;
    const newGrade = parseFloat(adjustForm.grade);
    if (isNaN(newGrade) || newGrade < 0 || newGrade > 100) {
      toast.error("Grade must be between 0 and 100");
      return;
    }
    await supabase.from("plan_performance_records").update({
      ceo_adjusted_grade: newGrade,
      grade: newGrade,
      ceo_notes: adjustForm.notes,
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", recordId);

    await supabase.from("notifications").insert({
      user_id: staffId,
      type: "points",
      title: "Performance Grade Adjusted",
      message: `Your performance grade was adjusted to ${newGrade}%. ${adjustForm.notes ? `Note: ${adjustForm.notes}` : ""}`,
    });

    toast.success("Grade adjusted and approved");
    setAdjusting(null);
    setAdjustForm({ grade: "", notes: "" });
    onRefresh();
  };

  if (records.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-4">No performance records yet.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      {isCeo && pendingRecords.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allPendingSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all pending"
            />
            <span className="text-sm text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} of ${pendingRecords.length} selected`
                : `${pendingRecords.length} pending approval`}
            </span>
          </div>
          {selected.size > 0 && (
            <Button
              size="sm"
              onClick={bulkApprove}
              disabled={bulkApproving}
              className="gap-1.5 gradient-brand text-primary-foreground font-heading"
            >
              <CheckCheck className="w-4 h-4" />
              {bulkApproving ? "Approving..." : `Approve ${selected.size}`}
            </Button>
          )}
        </div>
      )}

      {records.map((r) => {
        const pct = r.achievement_pct;
        const isFlagged = r.flagged || pct < 60;
        const isAdjusted = r.ceo_adjusted_grade !== null;
        const isPending = r.status === "pending";
        return (
          <Card key={r.id} className={`${isFlagged ? "border-destructive/30" : ""}`}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCeo && isPending && (
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleSelect(r.id)}
                      aria-label={`Select ${r.staff_name}`}
                    />
                  )}
                  <span className="text-sm font-heading font-semibold text-foreground">
                    {r.staff_name || "Staff"}
                  </span>
                  {r.plan_title && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">· {r.plan_title}</span>
                  )}
                  <Badge className={`text-[10px] border-0 ${r.plan_type === "daily" ? "bg-primary/10 text-primary" : r.plan_type === "weekly" ? "bg-cyan-500/10 text-cyan-600" : "bg-gold/10 text-gold"}`}>
                    {r.plan_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                  {r.status === "approved" && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                  <Badge className={`text-[10px] border-0 ${r.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30" : r.status === "pending" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
                    {r.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Planned: {r.planned_value}%</span>
                <span>Actual: {r.actual_value}%</span>
                <span className={`font-heading font-bold text-sm ${pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-destructive"}`}>
                  Achievement: {pct}%
                </span>
              </div>

              <Progress value={pct} className="h-2" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Grade: <span className={`font-heading font-bold ${r.grade >= 80 ? "text-green-600" : r.grade >= 60 ? "text-amber-600" : "text-destructive"}`}>{r.grade}/100</span>
                  {isAdjusted && (
                    <span className="ml-1 text-primary">(CEO adjusted)</span>
                  )}
                </span>
                <span className="text-muted-foreground">{r.period_key}</span>
              </div>

              {r.ceo_notes && (
                <div className="p-2 bg-muted/50 rounded text-xs">
                  <span className="font-heading font-semibold text-muted-foreground">CEO Note:</span> {r.ceo_notes}
                </div>
              )}

              {/* CEO Actions */}
              {isCeo && isPending && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => approveRecord(r.id)} className="gap-1 text-xs flex-1">
                    <Shield className="w-3 h-3" />Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAdjusting(r.id); setAdjustForm({ grade: String(r.achievement_pct), notes: "" }); }} className="gap-1 text-xs flex-1">
                    <ArrowUp className="w-3 h-3" />Adjust Grade
                  </Button>
                </div>
              )}

              {adjusting === r.id && (
                <div className="space-y-2 p-2 border border-primary/20 rounded-lg">
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Grade (0-100)" value={adjustForm.grade} onChange={(e) => setAdjustForm(f => ({ ...f, grade: e.target.value }))} min={0} max={100} className="flex-1" />
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setAdjustForm(f => ({ ...f, grade: String(Math.min(100, parseFloat(f.grade || "0") + 5)) }))} className="px-2">
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAdjustForm(f => ({ ...f, grade: String(Math.max(0, parseFloat(f.grade || "0") - 5)) }))} className="px-2">
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <Input placeholder="CEO notes (optional)" value={adjustForm.notes} onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAdjusting(null)} className="flex-1">Cancel</Button>
                    <Button size="sm" onClick={() => adjustGrade(r.id, r.staff_id)} className="flex-1 gradient-brand text-primary-foreground font-heading">Save</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
