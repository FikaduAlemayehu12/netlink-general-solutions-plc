import { useState, useEffect } from "react";
import { Trash2, RotateCcw, Search, Filter, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StaffLayout from "@/components/staff/StaffLayout";
import { toast } from "@/hooks/use-toast";

const TABLE_LABELS: Record<string, string> = {
  support_tickets: "Ticket",
  plans: "Plan",
  plan_comments: "Plan Comment",
  ticket_comments: "Ticket Comment",
  leave_requests: "Leave Request",
  direct_messages: "Message",
  project_groups: "Project",
  project_tasks: "Project Task",
  project_comments: "Project Comment",
  project_updates: "Project Update",
  announcements: "Announcement",
};

const TABLE_COLORS: Record<string, string> = {
  support_tickets: "bg-primary/10 text-primary",
  plans: "bg-accent/10 text-accent",
  plan_comments: "bg-accent/10 text-accent",
  leave_requests: "bg-destructive/10 text-destructive",
  direct_messages: "bg-muted text-muted-foreground",
  project_groups: "bg-gold/10 text-gold",
  project_tasks: "bg-gold/10 text-gold",
  announcements: "bg-primary/10 text-primary",
};

export default function RecycleBinPage() {
  const { isCeo } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: deleted }, { data: profs }] = await Promise.all([
      supabase.from("deleted_records" as any).select("*").order("deleted_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id, full_name, avatar_url"),
    ]);
    setRecords((deleted as any[]) || []);
    const map: Record<string, any> = {};
    (profs || []).forEach((p) => { map[p.user_id] = p; });
    setProfiles(map);
    setLoading(false);
  };

  const permanentDelete = async () => {
    if (!deleteId) return;
    await supabase.from("deleted_records" as any).delete().eq("id", deleteId);
    setRecords(prev => prev.filter(r => r.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Permanently deleted" });
  };

  const restoreRecord = async (record: any) => {
    setRestoring(record.id);
    try {
      const { original_table, record_data, original_id } = record;
      // Re-insert into original table
      const cleanData = { ...record_data };
      delete cleanData.id; // Let DB generate if needed or use original
      const { error } = await supabase.from(original_table as any).insert({ ...cleanData, id: original_id } as any);
      if (error) {
        toast({ title: "Restore failed", description: error.message, variant: "destructive" });
        setRestoring(null);
        return;
      }
      // Remove from recycle bin
      await supabase.from("deleted_records" as any).delete().eq("id", record.id);
      setRecords(prev => prev.filter(r => r.id !== record.id));
      toast({ title: "Record restored successfully" });
    } catch {
      toast({ title: "Restore failed", variant: "destructive" });
    }
    setRestoring(null);
  };

  if (!isCeo) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Access restricted to CEO only.</p>
        </div>
      </StaffLayout>
    );
  }

  const tables = [...new Set(records.map((r: any) => r.original_table))];
  const filtered = records.filter((r: any) => {
    const matchesTable = filterTable === "all" || r.original_table === filterTable;
    const matchesSearch = !search ||
      r.original_table?.toLowerCase().includes(search.toLowerCase()) ||
      profiles[r.deleted_by]?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(r.record_data)?.toLowerCase().includes(search.toLowerCase());
    return matchesTable && matchesSearch;
  });

  return (
    <StaffLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-destructive" />Recycle Bin
          </h1>
          <p className="text-muted-foreground text-sm">View, restore, or permanently delete removed records</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search deleted records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {["all", ...tables].map((t) => (
              <button key={t} onClick={() => setFilterTable(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-heading font-medium transition-colors ${filterTable === t ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {t === "all" ? "All" : TABLE_LABELS[t] || t}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filtered.length} deleted record{filtered.length !== 1 ? "s" : ""}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>Recycle bin is empty</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((record: any) => {
              const data = record.record_data || {};
              const title = data.title || data.content?.slice(0, 60) || data.name || data.full_name || record.original_id;
              return (
                <Card key={record.id} className="hover:shadow-sm transition-shadow border-destructive/10">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] ${TABLE_COLORS[record.original_table] || "bg-muted text-muted-foreground"}`}>
                          {TABLE_LABELS[record.original_table] || record.original_table}
                        </Badge>
                        <span className="text-sm font-medium text-foreground truncate">{title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Deleted by <span className="font-medium">{profiles[record.deleted_by]?.full_name || "Unknown"}</span>
                        {" · "}{format(new Date(record.deleted_at), "MMM d, yyyy h:mm a")}
                        {record.reason && <span> · {record.reason}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => restoreRecord(record)}
                        disabled={restoring === record.id} className="gap-1 text-xs">
                        <RotateCcw className="w-3 h-3" />{restoring === record.id ? "..." : "Restore"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(record.id)} className="gap-1 text-xs">
                        <Trash2 className="w-3 h-3" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={permanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
}
