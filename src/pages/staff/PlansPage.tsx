import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, ThumbsUp, ThumbsDown, CheckCircle, MessageCircle, ChevronDown, Paperclip, X, FileIcon, Download, Target, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StaffLayout from "@/components/staff/StaffLayout";
import { recordPlanPerformance } from "@/lib/performance-utils";
import { logActivity } from "@/lib/activity-logger";
import { archiveAndDelete, notifyCeo } from "@/lib/recycle-bin";
import { toast } from "sonner";

type PlanType = "daily" | "weekly" | "quarterly";

function MentionInput({ value, onChange, profiles }: { value: string; onChange: (v: string) => void; profiles: any[] }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf("@");
    if (atIdx !== -1 && !textBefore.slice(atIdx + 1).includes(" ")) {
      const search = textBefore.slice(atIdx + 1).toLowerCase();
      setMentionSearch(search);
      setMentionStart(atIdx);
      setSuggestions(profiles.filter((p) => p.full_name.toLowerCase().startsWith(search)).slice(0, 5));
    } else {
      setSuggestions([]);
      setMentionStart(-1);
    }
  };

  const pickSuggestion = (name: string) => {
    const firstName = name.split(" ")[0];
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionSearch.length + 1);
    onChange(`${before}@${firstName} ${after}`);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <textarea value={value} onChange={handleChange} rows={5}
        placeholder="Describe your plan... Use @firstname to mention supervisors"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground" />
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute z-20 bottom-full mb-1 left-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-48">
            {suggestions.map((p) => (
              <button key={p.user_id} onClick={() => pickSuggestion(p.full_name)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors text-left">
                <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                  {p.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">{p.position}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlansPage() {
  const { user, isExecutive, isCeo } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<PlanType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", plan_type: "daily" as PlanType });
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPerfForm, setShowPerfForm] = useState<string | null>(null);
  const [perfForm, setPerfForm] = useState({ planned: "100", actual: "" });
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string; planId: string } | null>(null);

  useEffect(() => {
    // Load profiles first, then plans (plans need the profile map for author info)
    (async () => {
      await fetchProfiles();
      await fetchPlans();
    })();
    const channel = supabase
      .channel('plans-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => fetchPlans())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_reactions' }, () => fetchPlans())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_comments' }, () => fetchPlans())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter, profiles.length]);

  const fetchPlans = async () => {
    let q = supabase
      .from("plans")
      .select("*, plan_reactions(reaction, user_id), plan_comments(id)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("plan_type", filter);
    const { data, error } = await q;
    if (error) {
      console.error("fetchPlans error:", error);
      toast.error("Failed to load plans");
    }
    // Attach profile info manually (no FK between plans and profiles)
    const profMap: Record<string, any> = {};
    profiles.forEach((p) => { profMap[p.user_id] = p; });
    const enriched = (data || []).map((pl: any) => ({
      ...pl,
      profiles: profMap[pl.author_id] || { full_name: "Unknown", position: "" },
    }));
    setPlans(enriched);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, position");
    setProfiles(data || []);
  };

  const submitPlan = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    let attachmentUrls: string[] = [];
    if (attachments.length > 0) {
      setUploadingFiles(true);
      for (const file of attachments) {
        const path = `${authUser.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("plan-attachments").upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("plan-attachments").getPublicUrl(path);
          attachmentUrls.push(publicUrl);
        }
      }
      setUploadingFiles(false);
    }

    const mentionMatches = form.content.match(/@(\w+)/g) || [];
    const mentionedIds: string[] = [];
    for (const m of mentionMatches) {
      const firstName = m.slice(1).toLowerCase();
      const found = profiles.find((p) => p.full_name.toLowerCase().startsWith(firstName));
      if (found) mentionedIds.push(found.user_id);
    }

    const { data: plan } = await supabase.from("plans").insert({
      ...form, author_id: authUser.id, mentioned_user_ids: mentionedIds, attachment_urls: attachmentUrls,
    }).select().single();

    if (plan) {
      const periodKey = new Date().toISOString().slice(0, 10);
      await supabase.from("plan_performance_records").upsert({
        staff_id: authUser.id, plan_id: plan.id, plan_type: form.plan_type,
        period_key: periodKey, planned_value: 100, actual_value: 0, status: "pending",
      }, { onConflict: "staff_id,plan_id" });
    }

    for (const uid of mentionedIds) {
      await supabase.from("notifications").insert({ user_id: uid, type: "mention", title: "You were mentioned", message: `mentioned in plan: "${form.title}"`, related_id: plan?.id });
    }

    await logActivity("create", "plans", plan?.id, "plan", { title: form.title });
    await notifyCeo("Created", "Plans", `New ${form.plan_type} plan: ${form.title}`, authUser.id, plan?.id);

    setForm({ title: "", content: "", plan_type: "daily" });
    setAttachments([]);
    setShowForm(false);
    setSubmitting(false);
    toast.success("Plan submitted");
    fetchPlans();
  };

  // Edit plan
  const saveEditPlan = async () => {
    if (!editingPlan || !user) return;
    await supabase.from("plans").update({
      title: editingPlan.title, content: editingPlan.content, plan_type: editingPlan.plan_type,
    }).eq("id", editingPlan.id);
    await logActivity("update", "plans", editingPlan.id, "plan", { title: editingPlan.title });
    await notifyCeo("Updated", "Plans", `Plan updated: ${editingPlan.title}`, user.id, editingPlan.id);
    setEditingPlan(null);
    toast.success("Plan updated");
    fetchPlans();
  };

  // Delete plan with recycle bin
  const confirmDeletePlan = async () => {
    if (!deletePlanId || !user) return;
    const plan = plans.find(p => p.id === deletePlanId);
    if (plan) {
      await archiveAndDelete("plans", deletePlanId, plan, user.id);
      await logActivity("delete", "plans", deletePlanId, "plan", { title: plan.title });
    }
    setDeletePlanId(null);
    toast.success("Plan moved to recycle bin");
    fetchPlans();
  };

  const canModifyPlan = (plan: any) => isCeo || isExecutive || plan.author_id === user?.id;

  const react = async (planId: string, reaction: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const existing = plans.find((p) => p.id === planId)?.plan_reactions?.find((r: any) => r.user_id === authUser.id);
    if (existing?.reaction === reaction) {
      await supabase.from("plan_reactions").delete().eq("plan_id", planId).eq("user_id", authUser.id);
    } else {
      await supabase.from("plan_reactions").upsert({ plan_id: planId, user_id: authUser.id, reaction });
    }
    fetchPlans();
  };

  const fetchComments = async (planId: string) => {
    const { data } = await supabase.from("plan_comments").select("*").eq("plan_id", planId).order("created_at");
    const profMap: Record<string, any> = {};
    profiles.forEach((p) => { profMap[p.user_id] = p; });
    const enriched = (data || []).map((c: any) => ({ ...c, profiles: profMap[c.author_id] || { full_name: "Unknown" } }));
    setComments((prev) => ({ ...prev, [planId]: enriched }));
  };

  const toggleExpand = (planId: string) => {
    if (expandedPlan === planId) { setExpandedPlan(null); return; }
    setExpandedPlan(planId);
    fetchComments(planId);
  };

  const submitComment = async (planId: string) => {
    const content = commentInput[planId]?.trim();
    if (!content) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("plan_comments").insert({ plan_id: planId, author_id: authUser.id, content });
    const plan = plans.find((p) => p.id === planId);
    if (plan && plan.author_id !== authUser.id) {
      await supabase.from("notifications").insert({ user_id: plan.author_id, type: "comment", title: "New comment on your plan", message: content.slice(0, 80), related_id: planId });
    }
    await logActivity("comment", "plans", planId, "plan_comment", { comment: content.slice(0, 100) });
    setCommentInput((prev) => ({ ...prev, [planId]: "" }));
    fetchComments(planId);
  };

  const deleteComment = async (commentId: string, planId: string) => {
    if (!user) return;
    const comment = comments[planId]?.find(c => c.id === commentId);
    if (comment) {
      await archiveAndDelete("plan_comments", commentId, comment, user.id);
      await logActivity("delete", "plans", commentId, "plan_comment");
    }
    fetchComments(planId);
  };

  const saveEditComment = async () => {
    if (!editingComment) return;
    await supabase.from("plan_comments").update({ content: editingComment.content }).eq("id", editingComment.id);
    setEditingComment(null);
    fetchComments(editingComment.planId);
  };

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= 100 * 1024 * 1024);
    setAttachments((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const submitPerformance = async (planId: string, planType: string) => {
    if (!user || !perfForm.actual) return;
    const planned = parseFloat(perfForm.planned);
    const actual = parseFloat(perfForm.actual);
    if (isNaN(planned) || isNaN(actual) || planned <= 0 || actual < 0 || actual > 100 || planned > 100) {
      toast.error("Values must be between 0 and 100");
      return;
    }
    await recordPlanPerformance(user.id, planId, planType, planned, actual);
    toast.success(`Performance recorded: ${Math.round((actual / planned) * 100)}% achievement`);
    setShowPerfForm(null);
    setPerfForm({ planned: "100", actual: "" });
  };

  const typeColor: Record<string, string> = { daily: "bg-primary/10 text-primary", weekly: "bg-cyan-brand/10 text-cyan-brand", quarterly: "bg-gold/10 text-gold" };

  return (
    <StaffLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Plans</h1>
            <p className="text-muted-foreground text-sm">Submit and review team plans</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow">
            <Plus className="w-4 h-4" />Submit Plan
          </Button>
        </div>

        {/* Submit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="border-primary/30 shadow-card">
                <CardHeader><CardTitle className="font-heading text-base">New Plan</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {(["daily", "weekly", "quarterly"] as PlanType[]).map((t) => (
                      <button key={t} onClick={() => setForm((f) => ({ ...f, plan_type: t }))}
                        className={`px-4 py-1.5 rounded-full text-sm font-heading font-semibold capitalize transition-colors ${form.plan_type === t ? typeColor[t] + " ring-1 ring-current" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Plan title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  <MentionInput value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} profiles={profiles} />

                  <div>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Paperclip className="w-4 h-4" />Attach files (max 100MB each)
                    </button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={addFiles} />
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {attachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <FileIcon className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setShowForm(false); setAttachments([]); }}>Cancel</Button>
                    <Button onClick={submitPlan} disabled={submitting || uploadingFiles} className="gradient-brand text-primary-foreground font-heading gap-2">
                      <Send className="w-4 h-4" />{uploadingFiles ? "Uploading…" : submitting ? "Submitting…" : "Submit"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "daily", "weekly", "quarterly"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-semibold capitalize transition-colors ${filter === t ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t === "all" ? "All Plans" : t}
            </button>
          ))}
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No plans found. Submit your first plan!</div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const myReaction = plan.plan_reactions?.find((r: any) => r.user_id === user?.id)?.reaction;
              const likes = plan.plan_reactions?.filter((r: any) => r.reaction === "like").length || 0;
              const dislikes = plan.plan_reactions?.filter((r: any) => r.reaction === "dislike").length || 0;
              const approves = plan.plan_reactions?.filter((r: any) => r.reaction === "approve").length || 0;
              const planAttachments = (plan as any).attachment_urls || [];
              return (
                <Card key={plan.id} className="shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold font-heading text-sm flex-shrink-0">
                        {plan.profiles?.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-semibold text-foreground text-sm">{plan.profiles?.full_name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-heading font-semibold uppercase ${typeColor[plan.plan_type]}`}>{plan.plan_type}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(plan.created_at).toLocaleDateString()}</span>
                          {canModifyPlan(plan) && (
                            <div className="flex gap-1">
                              <button onClick={() => setEditingPlan({ ...plan })} className="text-muted-foreground hover:text-foreground p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeletePlanId(plan.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                        <div className="font-heading font-bold text-foreground mt-1">{plan.title}</div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{plan.content}</p>

                        {planAttachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {planAttachments.map((url: string, i: number) => {
                              const fileName = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file").replace(/^\d+-/, "");
                              return (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors">
                                  <Download className="w-3 h-3" />{fileName.length > 20 ? fileName.slice(0, 20) + "…" : fileName}
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {/* Reactions */}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                          <button onClick={() => react(plan.id, "like")} className={`flex items-center gap-1.5 text-sm transition-colors ${myReaction === "like" ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"}`}>
                            <ThumbsUp className="w-4 h-4" />{likes}
                          </button>
                          <button onClick={() => react(plan.id, "dislike")} className={`flex items-center gap-1.5 text-sm transition-colors ${myReaction === "dislike" ? "text-destructive font-semibold" : "text-muted-foreground hover:text-destructive"}`}>
                            <ThumbsDown className="w-4 h-4" />{dislikes}
                          </button>
                          {isExecutive && (
                            <button onClick={() => react(plan.id, "approve")} className={`flex items-center gap-1.5 text-sm transition-colors ${myReaction === "approve" ? "text-green-600 font-semibold" : "text-muted-foreground hover:text-green-600"}`}>
                              <CheckCircle className="w-4 h-4" />{approves > 0 && approves} Approve
                            </button>
                          )}
                          <button onClick={() => toggleExpand(plan.id)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground ml-auto transition-colors">
                            <MessageCircle className="w-4 h-4" />{plan.plan_comments?.length || 0}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedPlan === plan.id ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {/* Performance Recording */}
                        {plan.author_id === user?.id && (
                          <div className="mt-2">
                            {showPerfForm === plan.id ? (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3 border border-primary/20 rounded-lg space-y-2">
                                <div className="text-xs font-heading font-semibold text-foreground flex items-center gap-1">
                                  <Target className="w-3 h-3 text-primary" />Record Achievement
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Planned %</label>
                                    <Input type="number" value={perfForm.planned} onChange={(e) => setPerfForm(f => ({ ...f, planned: e.target.value }))} min={1} max={100} className="h-8 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Actual %</label>
                                    <Input type="number" value={perfForm.actual} onChange={(e) => setPerfForm(f => ({ ...f, actual: e.target.value }))} min={0} max={100} className="h-8 text-sm" placeholder="e.g. 75" />
                                  </div>
                                </div>
                                {perfForm.actual && perfForm.planned && (
                                  <div className="flex items-center gap-2">
                                    <Progress value={Math.min(100, (parseFloat(perfForm.actual) / parseFloat(perfForm.planned)) * 100)} className="h-1.5 flex-1" />
                                    <span className={`text-xs font-heading font-bold ${(parseFloat(perfForm.actual) / parseFloat(perfForm.planned)) * 100 >= 60 ? "text-green-600" : "text-destructive"}`}>
                                      {Math.round((parseFloat(perfForm.actual) / parseFloat(perfForm.planned)) * 100)}%
                                    </span>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setShowPerfForm(null)} className="flex-1 text-xs">Cancel</Button>
                                  <Button size="sm" onClick={() => submitPerformance(plan.id, plan.plan_type)} className="flex-1 gradient-brand text-primary-foreground text-xs font-heading">Submit</Button>
                                </div>
                              </motion.div>
                            ) : (
                              <button onClick={() => { setShowPerfForm(plan.id); setPerfForm({ planned: "100", actual: "" }); }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                <Target className="w-3 h-3" />Record Achievement
                              </button>
                            )}
                          </div>
                        )}

                        {/* Comments */}
                        <AnimatePresence>
                          {expandedPlan === plan.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2">
                              {(comments[plan.id] || []).map((c) => (
                                <div key={c.id} className="flex gap-2 group">
                                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-heading text-foreground flex-shrink-0">
                                    {c.profiles?.full_name?.charAt(0)}
                                  </div>
                                  <div className="bg-muted rounded-xl px-3 py-2 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold font-heading text-foreground">{c.profiles?.full_name}</span>
                                      {(c.author_id === user?.id || isCeo) && (
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                          <button onClick={() => setEditingComment({ id: c.id, content: c.content, planId: plan.id })} className="text-muted-foreground hover:text-foreground"><Edit2 className="w-3 h-3" /></button>
                                          <button onClick={() => deleteComment(c.id, plan.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      )}
                                    </div>
                                     {editingComment && editingComment.id === c.id ? (
                                      <div className="flex gap-1 mt-1">
                                        <Input value={editingComment.content} onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })} className="text-xs h-7" />
                                        <Button size="sm" onClick={saveEditComment} className="h-7 text-xs">Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)} className="h-7 text-xs">✕</Button>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-foreground mt-0.5">{c.content}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div className="flex gap-2 mt-2">
                                <Input placeholder="Write a comment…" value={commentInput[plan.id] || ""} onChange={(e) => setCommentInput((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === "Enter" && submitComment(plan.id)} className="text-sm" />
                                <Button size="sm" onClick={() => submitComment(plan.id)} className="gradient-brand text-primary-foreground flex-shrink-0">
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      <AnimatePresence>
        {editingPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader><CardTitle className="font-heading">Edit Plan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  {(["daily", "weekly", "quarterly"] as PlanType[]).map((t) => (
                    <button key={t} onClick={() => setEditingPlan({ ...editingPlan, plan_type: t })}
                      className={`px-3 py-1 rounded-full text-xs font-heading font-semibold capitalize transition-colors ${editingPlan.plan_type === t ? typeColor[t] + " ring-1 ring-current" : "bg-muted text-muted-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <Input value={editingPlan.title} onChange={(e) => setEditingPlan({ ...editingPlan, title: e.target.value })} />
                <Textarea value={editingPlan.content} onChange={(e) => setEditingPlan({ ...editingPlan, content: e.target.value })} rows={5} />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditingPlan(null)} className="flex-1">Cancel</Button>
                  <Button onClick={saveEditPlan} className="flex-1 gradient-brand text-primary-foreground">Save</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePlanId} onOpenChange={(open) => !open && setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              The plan will be moved to the recycle bin and can be restored by the CEO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
}
