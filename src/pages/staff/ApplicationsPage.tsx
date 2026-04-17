import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Mail, Search, Eye, Calendar, User, Send, Loader2, ExternalLink } from "lucide-react";
import StaffLayout from "@/components/staff/StaffLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  position: string | null;
  cover_message: string | null;
  cv_url: string | null;
  vacancy_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  reviewing: "bg-cyan-brand/10 text-cyan-brand",
  shortlisted: "bg-accent/10 text-accent",
  interview: "bg-gold/10 text-gold",
  rejected: "bg-destructive/10 text-destructive",
  hired: "bg-green-500/10 text-green-600",
};

/** Extract the storage path from a full Supabase public URL */
function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.substring(idx + marker.length));
}

/** Download a file from Supabase storage via JS client (avoids ad-blocker issues) */
async function downloadFileFromStorage(publicUrl: string, bucket: string, fallbackName: string) {
  const path = extractStoragePath(publicUrl, bucket);
  if (!path) {
    // Fallback: open in new tab
    window.open(publicUrl, "_blank");
    return;
  }
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    window.open(publicUrl, "_blank");
    return;
  }
  const blobUrl = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = path.split("/").pop() || fallbackName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

export default function ApplicationsPage() {
  const { isCeo, isExecutive } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [vacancyTitles, setVacancyTitles] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("job_applications").select("*").order("created_at", { ascending: false });
    setApplications((data || []) as Application[]);
    const { data: vacs } = await supabase.from("job_vacancies" as any).select("id, title");
    const map: Record<string, string> = {};
    for (const v of (vacs || []) as any[]) map[v.id] = v.title;
    setVacancyTitles(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (app: Application, newStatus: string) => {
    await supabase.from("job_applications").update({ status: newStatus }).eq("id", app.id);
    logActivity("status_change", "announcements" as any, app.id, "job_application", {
      applicant: app.applicant_name, from: app.status, to: newStatus,
    });
    toast({ title: `Status updated to ${newStatus}` });
    load();
    if (selected?.id === app.id) setSelected({ ...app, status: newStatus });
  };

  const handleDownloadCv = async (cvUrl: string) => {
    setDownloading(true);
    try {
      await downloadFileFromStorage(cvUrl, "job-applications", "cv-document");
    } catch {
      window.open(cvUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const handleViewCv = async (cvUrl: string) => {
    // For viewing, download and open blob URL in new tab
    const path = extractStoragePath(cvUrl, "job-applications");
    if (!path) {
      window.open(cvUrl, "_blank");
      return;
    }
    const { data, error } = await supabase.storage.from("job-applications").download(path);
    if (error || !data) {
      window.open(cvUrl, "_blank");
      return;
    }
    const blobUrl = URL.createObjectURL(data);
    window.open(blobUrl, "_blank");
  };

  const sendReply = async () => {
    if (!selected || !replyMessage.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-announcement-email", {
        body: {
          title: replySubject || `Update on your application - ${selected.position || "Position"}`,
          content: replyMessage,
          recipients: [selected.applicant_email],
        },
      });
      if (error) throw error;
      logActivity("comment", "announcements" as any, selected.id, "job_application", {
        applicant: selected.applicant_name, subject: replySubject, message_preview: replyMessage.slice(0, 100),
      });
      toast({ title: "Reply sent", description: `Email sent to ${selected.applicant_email}` });
      setReplyOpen(false);
      setReplySubject("");
      setReplyMessage("");
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const filtered = applications.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.applicant_name.toLowerCase().includes(s) || a.applicant_email.toLowerCase().includes(s) || (a.position || "").toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">Job Applications</h1>
          <p className="text-sm text-muted-foreground">Review and manage candidate applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {["new", "reviewing", "shortlisted", "interview", "rejected", "hired"].map(s => {
            const count = applications.filter(a => a.status === s).length;
            return (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className={`p-3 rounded-xl border text-center transition-all ${filterStatus === s ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                <div className="text-xl font-heading font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{s}</div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search applicants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No applications found</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-4 hover:border-cyan-brand/30 transition-all cursor-pointer"
                onClick={() => setSelected(a)}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center flex-shrink-0 text-primary-foreground font-heading font-bold text-sm">
                    {a.applicant_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-foreground">{a.applicant_name}</span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.applicant_email}</div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      {a.position && <span>📋 {a.position}</span>}
                      {a.cv_url && <span className="text-primary">📎 CV attached</span>}
                      <span><Calendar className="w-3 h-3 inline mr-1" />{format(new Date(a.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <User className="w-5 h-5" /> {selected.applicant_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Info Grid */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-sm font-medium">{selected.applicant_email}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Position</p>
                    <p className="text-sm font-medium">{selected.position || "Not specified"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Applied On</p>
                    <p className="text-sm font-medium">{format(new Date(selected.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Status</p>
                    <Select value={selected.status} onValueChange={v => updateStatus(selected, v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["new", "reviewing", "shortlisted", "interview", "rejected", "hired"].map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Linked Vacancy */}
                {selected.vacancy_id && vacancyTitles[selected.vacancy_id] && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Applied For Vacancy</p>
                    <p className="text-sm font-medium text-primary">{vacancyTitles[selected.vacancy_id]}</p>
                  </div>
                )}

                {/* CV */}
                {selected.cv_url && (
                  <div className="p-3 rounded-lg border border-cyan-brand/20 bg-cyan-brand/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">CV / Resume</p>
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-cyan-brand" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Attached Document</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={downloading}
                        onClick={() => handleDownloadCv(selected.cv_url!)}>
                        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => handleViewCv(selected.cv_url!)}>
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cover Message */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cover Letter / Message</p>
                  <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap leading-relaxed">
                    {selected.cover_message || "No message provided"}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => { setReplySubject(""); setReplyMessage(""); setReplyOpen(true); }} className="gap-1.5 gradient-brand text-primary-foreground">
                    <Mail className="w-4 h-4" /> Reply to Applicant
                  </Button>
                  <a href={`mailto:${selected.applicant_email}`}>
                    <Button variant="outline" className="gap-1.5">
                      <Send className="w-4 h-4" /> Open Email
                    </Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Reply to {selected?.applicant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Input value={replySubject} onChange={e => setReplySubject(e.target.value)}
                placeholder={`Update on your application - ${selected?.position || "Position"}`} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message *</label>
              <Textarea value={replyMessage} onChange={e => setReplyMessage(e.target.value)} rows={6}
                placeholder="e.g. We would like to invite you for a written exam on..." />
            </div>
            <Button onClick={sendReply} disabled={sending || !replyMessage.trim()} className="w-full gradient-brand text-primary-foreground gap-2">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Email</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
