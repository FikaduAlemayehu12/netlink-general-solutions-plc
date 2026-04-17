import { useState, useEffect } from "react";
import { Activity, Search, Filter, ChevronDown, MessageSquare, Video, Phone, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StaffLayout from "@/components/staff/StaffLayout";

const MODULE_COLORS: Record<string, string> = {
  tickets: "bg-primary/10 text-primary",
  plans: "bg-accent/10 text-accent",
  projects: "bg-gold/10 text-gold",
  messages: "bg-muted text-muted-foreground",
  leave: "bg-destructive/10 text-destructive",
  attendance: "bg-primary/10 text-primary",
  salary: "bg-gold/10 text-gold",
  team: "bg-accent/10 text-accent",
  announcements: "bg-primary/10 text-primary",
  settings: "bg-muted text-muted-foreground",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  assign: "Assigned",
  upload: "Uploaded",
  comment: "Commented",
  status_change: "Changed Status",
  approve: "Approved",
  reject: "Rejected",
};

const CONV_TYPE_LABELS: Record<string, { label: string; icon: typeof MessageSquare }> = {
  text: { label: "Text Message", icon: MessageSquare },
  audio: { label: "Voice Message", icon: Phone },
  audio_call: { label: "Voice Call", icon: Phone },
  video_call: { label: "Video Call", icon: Video },
  attachment: { label: "File Attachment", icon: Paperclip },
};

// Keys to display with friendly labels, hiding raw IDs
const DETAIL_LABELS: Record<string, string> = {
  sender: "From",
  recipient: "To",
  content: "Message Content",
  conversation_type: "Type",
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  category: "Category",
  reason: "Reason",
  leave_type: "Leave Type",
  start_date: "Start Date",
  end_date: "End Date",
  notes: "Notes",
  plan_type: "Plan Type",
  old_status: "Previous Status",
  new_status: "New Status",
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length === 0 ? "None" : value.join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default function ActivityLogPage() {
  const { isCeo, isExecutive } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: logsData }, { data: profilesData }] = await Promise.all([
      supabase.from("activity_logs" as any).select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id, full_name, avatar_url"),
    ]);
    setLogs((logsData as any[]) || []);
    const map: Record<string, any> = {};
    (profilesData || []).forEach((p) => { map[p.user_id] = p; });
    setProfiles(map);
    setLoading(false);
  };

  if (!isCeo && !isExecutive) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Access restricted to executives.</p>
        </div>
      </StaffLayout>
    );
  }

  const modules = [...new Set(logs.map((l: any) => l.module))];
  const filtered = logs.filter((l: any) => {
    const matchesModule = filterModule === "all" || l.module === filterModule;
    const matchesSearch = !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.module?.toLowerCase().includes(search.toLowerCase()) ||
      profiles[l.user_id]?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.details)?.toLowerCase().includes(search.toLowerCase());
    return matchesModule && matchesSearch;
  });

  const detailEntries = selectedLog?.details ? Object.entries(selectedLog.details) : [];

  return (
    <StaffLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />Activity Monitor
          </h1>
          <p className="text-muted-foreground text-sm">Track all user actions across the system. Click any entry for full details.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search actions, users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {["all", ...modules].map((m) => (
              <button key={m} onClick={() => setFilterModule(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-heading font-medium transition-colors ${filterModule === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {m === "all" ? "All" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>No activity logs found</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-1">
            {filtered.map((log: any) => {
              const preview = log.details?.title || log.details?.description || log.details?.content;
              const convType = log.details?.conversation_type;
              const ConvIcon = convType && CONV_TYPE_LABELS[convType]?.icon;
              return (
                <Card
                  key={log.id}
                  className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                  style={{ borderLeftColor: `hsl(var(--primary))` }}
                  onClick={() => setSelectedLog(log)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-xs text-primary-foreground font-bold flex-shrink-0">
                      {profiles[log.user_id]?.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{profiles[log.user_id]?.full_name || "Unknown"}</span>
                        <Badge variant="outline" className="text-[10px]">{ACTION_LABELS[log.action] || log.action}</Badge>
                        <Badge className={`text-[10px] ${MODULE_COLORS[log.module] || "bg-muted text-muted-foreground"}`}>{log.module}</Badge>
                        {ConvIcon && <ConvIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      {log.details?.sender && log.details?.recipient && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/70">{log.details.sender}</span>
                          {" → "}
                          <span className="font-medium text-foreground/70">{log.details.recipient}</span>
                          {log.details.content && `: ${String(log.details.content).slice(0, 80)}${String(log.details.content).length > 80 ? "…" : ""}`}
                        </p>
                      )}
                      {!log.details?.sender && preview && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{String(preview)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity Detail
            </DialogTitle>
            <DialogDescription>Full details of this activity log entry</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">User</p>
                  <p className="font-medium text-foreground">{profiles[selectedLog.user_id]?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Action</p>
                  <Badge variant="outline">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Module</p>
                  <Badge className={MODULE_COLORS[selectedLog.module] || "bg-muted text-muted-foreground"}>{selectedLog.module}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Time</p>
                  <p className="font-medium text-foreground">{format(new Date(selectedLog.created_at), "MMM d, yyyy h:mm:ss a")}</p>
                </div>
                {selectedLog.target_id && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Target ID</p>
                    <p className="font-mono text-xs text-foreground break-all">{selectedLog.target_id}</p>
                  </div>
                )}
                {selectedLog.target_type && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Target Type</p>
                    <p className="font-medium text-foreground">{selectedLog.target_type}</p>
                  </div>
                )}
              </div>

              {/* Full Details */}
              {detailEntries.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-heading font-semibold text-foreground mb-2">Full Details</p>
                  <div className="space-y-2">
                    {detailEntries
                      .filter(([key, value]) => {
                        // Skip raw UUIDs used as values (e.g. old "to: <uuid>" entries)
                        const strVal = String(value);
                        return !(key === "to" && isUUID(strVal));
                      })
                      .map(([key, value]) => {
                        const label = DETAIL_LABELS[key] || key.replace(/_/g, " ");
                        const strVal = String(value);
                        // Resolve conversation_type to friendly label
                        if (key === "conversation_type" && CONV_TYPE_LABELS[strVal]) {
                          const ConvIcon = CONV_TYPE_LABELS[strVal].icon;
                          return (
                            <div key={key} className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2">
                              <ConvIcon className="w-4 h-4 text-primary flex-shrink-0" />
                              <div>
                                <p className="text-[11px] font-medium text-primary mb-0.5">{label}</p>
                                <p className="text-sm text-foreground">{CONV_TYPE_LABELS[strVal].label}</p>
                              </div>
                            </div>
                          );
                        }
                        // Resolve UUID values to profile names
                        const displayValue = isUUID(strVal) && profiles[strVal]
                          ? profiles[strVal].full_name
                          : formatValue(value);
                        return (
                          <div key={key} className="bg-muted/50 rounded-lg p-2.5">
                            <p className="text-[11px] font-medium text-primary capitalize mb-0.5">{label}</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{displayValue}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {detailEntries.length === 0 && (
                <div className="border-t pt-3 text-center text-muted-foreground text-sm py-4">
                  No additional details recorded for this action.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
