import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Eye, EyeOff, Briefcase, Search, Users, Globe, Lock } from "lucide-react";
import StaffLayout from "@/components/staff/StaffLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";

interface Vacancy {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  responsibilities: string | null;
  qualifications: string | null;
  skills: string | null;
  experience: string | null;
  education: string | null;
  certifications: string | null;
  employment_type: string;
  salary_range: string | null;
  benefits: string | null;
  location: string | null;
  working_hours: string | null;
  deadline: string | null;
  openings: number;
  reporting_manager: string | null;
  vacancy_type: string;
  status: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  title: "", department: "", description: "", responsibilities: "", qualifications: "",
  skills: "", experience: "", education: "", certifications: "", employment_type: "full-time",
  salary_range: "", benefits: "", location: "Addis Ababa", working_hours: "", deadline: "",
  openings: 1, reporting_manager: "", vacancy_type: "external", status: "draft",
};

export default function VacanciesPage() {
  const { user, isCeo } = useAuth();
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState<Vacancy | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from("job_vacancies" as any).select("*").order("created_at", { ascending: false });
    setVacancies((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!user) return;

    const payload = { ...form, openings: Number(form.openings) || 1, author_id: user.id } as any;
    if (!payload.deadline) delete payload.deadline;

    if (editingId) {
      const { error } = await supabase.from("job_vacancies" as any).update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error updating vacancy", description: error.message, variant: "destructive" }); return; }
      logActivity("update", "announcements" as any, editingId, "job_vacancy", { title: form.title, vacancy_type: form.vacancy_type, status: form.status });
      toast({ title: "Vacancy updated" });
    } else {
      const { error } = await supabase.from("job_vacancies" as any).insert(payload);
      if (error) { toast({ title: "Error creating vacancy", description: error.message, variant: "destructive" }); return; }
      logActivity("create", "announcements" as any, undefined, "job_vacancy", { title: form.title, vacancy_type: form.vacancy_type, status: form.status });
      toast({ title: "Vacancy created" });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const handleEdit = (v: Vacancy) => {
    setEditingId(v.id);
    setForm({
      title: v.title, department: v.department || "", description: v.description || "",
      responsibilities: v.responsibilities || "", qualifications: v.qualifications || "",
      skills: v.skills || "", experience: v.experience || "", education: v.education || "",
      certifications: v.certifications || "", employment_type: v.employment_type,
      salary_range: v.salary_range || "", benefits: v.benefits || "", location: v.location || "",
      working_hours: v.working_hours || "", deadline: v.deadline || "", openings: v.openings,
      reporting_manager: v.reporting_manager || "", vacancy_type: v.vacancy_type, status: v.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const v = vacancies.find(x => x.id === deleteId);
    await supabase.from("job_vacancies" as any).delete().eq("id", deleteId);
    logActivity("delete", "announcements" as any, deleteId, "job_vacancy", { title: v?.title });
    toast({ title: "Vacancy deleted" });
    setDeleteId(null);
    load();
  };

  const toggleStatus = async (v: Vacancy) => {
    const newStatus = v.status === "published" ? "draft" : "published";
    await supabase.from("job_vacancies" as any).update({ status: newStatus }).eq("id", v.id);
    logActivity("status_change", "announcements" as any, v.id, "job_vacancy", { title: v.title, from: v.status, to: newStatus });
    toast({ title: `Vacancy ${newStatus === "published" ? "published" : "unpublished"}` });
    load();
  };

  const filtered = vacancies.filter(v => {
    if (filterType !== "all" && v.vacancy_type !== filterType) return false;
    if (filterStatus !== "all" && v.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return v.title.toLowerCase().includes(s) || (v.department || "").toLowerCase().includes(s) || (v.location || "").toLowerCase().includes(s);
    }
    return true;
  });

  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
      </div>
    );
  };

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Job Vacancies</h1>
            <p className="text-sm text-muted-foreground">Manage internal and external job postings</p>
          </div>
          {isCeo && (
            <Button onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }} className="gradient-brand text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> New Vacancy
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search vacancies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No vacancies found</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-cyan-brand/30 transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={v.vacancy_type === "internal" ? "secondary" : "default"} className="gap-1 text-xs">
                        {v.vacancy_type === "internal" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {v.vacancy_type}
                      </Badge>
                      <Badge variant={v.status === "published" ? "default" : "outline"} className="text-xs">
                        {v.status}
                      </Badge>
                      {v.employment_type && <Badge variant="outline" className="text-xs">{v.employment_type}</Badge>}
                      {v.department && <span className="text-xs px-2 py-0.5 bg-cyan-brand/10 text-cyan-brand rounded-full">{v.department}</span>}
                    </div>
                    <h3 className="font-heading font-semibold text-base text-foreground cursor-pointer hover:text-primary" onClick={() => setViewDialog(v)}>
                      {v.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {v.location && <span>📍 {v.location}</span>}
                      {v.openings > 0 && <span><Users className="w-3 h-3 inline mr-1" />{v.openings} opening{v.openings > 1 ? "s" : ""}</span>}
                      {v.deadline && <span>⏰ Deadline: {format(new Date(v.deadline), "MMM d, yyyy")}</span>}
                      {v.salary_range && <span>💰 {v.salary_range}</span>}
                    </div>
                  </div>
                  {isCeo && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(v)} title={v.status === "published" ? "Unpublish" : "Publish"}>
                        {v.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(v)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(v.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Edit Vacancy" : "Create Vacancy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input value={form.title} onChange={e => handleChange("title", e.target.value)} placeholder="e.g. Network Engineer" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Input value={form.department} onChange={e => handleChange("department", e.target.value)} placeholder="e.g. Engineering" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Vacancy Type *</label>
                <Select value={form.vacancy_type} onValueChange={v => handleChange("vacancy_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External (Public + Staff)</SelectItem>
                    <SelectItem value="internal">Internal (Staff Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Employment Type</label>
                <Select value={form.employment_type} onValueChange={v => handleChange("employment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => handleChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Job Description</label>
              <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} rows={3} placeholder="Describe the role..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Responsibilities</label>
              <Textarea value={form.responsibilities} onChange={e => handleChange("responsibilities", e.target.value)} rows={3} placeholder="Key responsibilities..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Qualifications</label>
                <Textarea value={form.qualifications} onChange={e => handleChange("qualifications", e.target.value)} rows={2} placeholder="Required qualifications..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Skills</label>
                <Textarea value={form.skills} onChange={e => handleChange("skills", e.target.value)} rows={2} placeholder="Required skills..." />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Experience</label>
                <Input value={form.experience} onChange={e => handleChange("experience", e.target.value)} placeholder="e.g. 3+ years" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Education</label>
                <Input value={form.education} onChange={e => handleChange("education", e.target.value)} placeholder="e.g. BSc in CS" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Certifications</label>
                <Input value={form.certifications} onChange={e => handleChange("certifications", e.target.value)} placeholder="e.g. CCNA, CCNP" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Salary Range</label>
                <Input value={form.salary_range} onChange={e => handleChange("salary_range", e.target.value)} placeholder="e.g. 15,000–25,000 ETB" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input value={form.location} onChange={e => handleChange("location", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Working Hours</label>
                <Input value={form.working_hours} onChange={e => handleChange("working_hours", e.target.value)} placeholder="e.g. Mon–Fri 9–5" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Benefits</label>
              <Textarea value={form.benefits} onChange={e => handleChange("benefits", e.target.value)} rows={2} placeholder="Health insurance, transport allowance..." />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Openings</label>
                <Input type="number" min={1} value={form.openings} onChange={e => handleChange("openings", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Deadline</label>
                <Input type="date" value={form.deadline} onChange={e => handleChange("deadline", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Reporting Manager</label>
                <Input value={form.reporting_manager} onChange={e => handleChange("reporting_manager", e.target.value)} placeholder="e.g. CTO" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); }}>Cancel</Button>
              <Button onClick={handleSave} className="gradient-brand text-primary-foreground">{editingId ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={o => { if (!o) setViewDialog(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> {viewDialog?.title}
            </DialogTitle>
          </DialogHeader>
          {viewDialog && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={viewDialog.vacancy_type === "internal" ? "secondary" : "default"}>{viewDialog.vacancy_type}</Badge>
                <Badge variant={viewDialog.status === "published" ? "default" : "outline"}>{viewDialog.status}</Badge>
                <Badge variant="outline">{viewDialog.employment_type}</Badge>
              </div>
              <DetailRow label="Department" value={viewDialog.department} />
              <DetailRow label="Description" value={viewDialog.description} />
              <DetailRow label="Responsibilities" value={viewDialog.responsibilities} />
              <DetailRow label="Qualifications" value={viewDialog.qualifications} />
              <DetailRow label="Skills" value={viewDialog.skills} />
              <DetailRow label="Experience" value={viewDialog.experience} />
              <DetailRow label="Education" value={viewDialog.education} />
              <DetailRow label="Certifications" value={viewDialog.certifications} />
              <DetailRow label="Salary Range" value={viewDialog.salary_range} />
              <DetailRow label="Benefits" value={viewDialog.benefits} />
              <DetailRow label="Location" value={viewDialog.location} />
              <DetailRow label="Working Hours" value={viewDialog.working_hours} />
              <DetailRow label="Openings" value={String(viewDialog.openings)} />
              <DetailRow label="Reporting Manager" value={viewDialog.reporting_manager} />
              <DetailRow label="Deadline" value={viewDialog.deadline ? format(new Date(viewDialog.deadline), "MMM d, yyyy") : null} />
              <DetailRow label="Posted" value={format(new Date(viewDialog.created_at), "MMM d, yyyy 'at' h:mm a")} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vacancy?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this vacancy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
}
