import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  User, FileText, GraduationCap, Award, Upload, Plus, Eye, Trash2,
  CheckCircle, Clock, XCircle, Sparkles, Download, Edit, Shield, Printer, FileDown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ROLE_LABELS, type AppRole } from "@/lib/supabase";
import { openExperienceLetterPDF, downloadAsWord, downloadAsExcel, generateExperienceLetterHTML, type ExperienceLetterPDFData } from "@/lib/experience-letter-pdf";

const QUALIFICATION_TYPES = ["BA", "BSc", "MBA", "MSc", "PhD", "Diploma", "Certificate", "Professional Certification"];
const DOCUMENT_TYPES = [
  { value: "cv", label: "CV / Resume" },
  { value: "academic_certificate", label: "Academic Certificate" },
  { value: "transcript", label: "Academic Transcript" },
  { value: "professional_cert", label: "Professional Certification" },
  { value: "recommendation", label: "Recommendation Letter" },
  { value: "national_id", label: "National ID / Passport" },
  { value: "contract", label: "Employment Contract" },
  { value: "other", label: "Other Document" },
];

interface EmployeeProfileManagerProps {
  staffUserId?: string;
}

export default function EmployeeProfileManager({ staffUserId }: EmployeeProfileManagerProps) {
  const { user, isCeo, roles } = useAuth();
  const isHR = roles.includes("hr");
  const canManage = isCeo || isHR;
  const targetUserId = staffUserId || user?.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [empProfile, setEmpProfile] = useState<any>(null);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [letters, setLetters] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [previewLetter, setPreviewLetter] = useState<any | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [editingEmpProfile, setEditingEmpProfile] = useState(false);
  const [empForm, setEmpForm] = useState<any>({});
  const [showQualDialog, setShowQualDialog] = useState(false);
  const [qualForm, setQualForm] = useState<any>({ qualification_type: "", title: "", institution: "", field_of_study: "", date_obtained: "" });
  const [showLetterDialog, setShowLetterDialog] = useState(false);
  const [letterForm, setLetterForm] = useState({ letter_type: "experience", period_start: "", period_end: "" });
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const qualFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (targetUserId) loadAll();
  }, [targetUserId]);

  const loadAll = async () => {
    if (!targetUserId) return;
    setLoading(true);
    const [profRes, empRes, qualRes, docRes, letRes, auditRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetUserId).single(),
      supabase.from("employee_profiles").select("*").eq("user_id", targetUserId).single(),
      supabase.from("employee_qualifications").select("*").eq("user_id", targetUserId).order("date_obtained", { ascending: false }),
      supabase.from("employee_documents").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
      supabase.from("experience_letters").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
      canManage ? supabase.from("employee_audit_log").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
    ]);

    setProfile(profRes.data);
    setEmpProfile(empRes.data);
    setEmpForm(empRes.data || {});
    setQualifications(qualRes.data || []);
    setDocuments(docRes.data || []);
    setLetters(letRes.data || []);
    setAuditLogs((auditRes as any).data || []);
    setLoading(false);
  };

  const saveEmpProfile = async () => {
    if (!targetUserId || !user) return;
    const payload = {
      user_id: targetUserId,
      hiring_date: empForm.hiring_date || null,
      department: empForm.department || null,
      hiring_position: empForm.hiring_position || null,
      previous_experience: empForm.previous_experience || null,
      emergency_contact_name: empForm.emergency_contact_name || null,
      emergency_contact_phone: empForm.emergency_contact_phone || null,
      national_id: empForm.national_id || null,
      bank_account: empForm.bank_account || null,
      notes: empForm.notes || null,
      status: empForm.status || "active",
      resignation_date: empForm.resignation_date || null,
    };

    let error;
    if (empProfile) {
      const res = await supabase.from("employee_profiles").update(payload).eq("user_id", targetUserId);
      error = res.error;
    } else {
      const res = await supabase.from("employee_profiles").insert(payload);
      error = res.error;
    }

    if (error) {
      toast.error(error.message);
    } else {
      await supabase.from("employee_audit_log").insert({
        user_id: targetUserId, changed_by: user.id,
        change_type: empProfile ? "update" : "create",
        table_name: "employee_profiles", old_data: empProfile || null, new_data: payload,
      });
      toast.success("Employee profile saved");
      setEditingEmpProfile(false);
      loadAll();
    }
  };

  const addQualification = async () => {
    if (!targetUserId || !user || !qualForm.qualification_type || !qualForm.title) {
      toast.error("Type and title are required");
      return;
    }
    let documentUrl = null;
    const file = qualFileRef.current?.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${targetUserId}/qualifications/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, file);
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from("employee-documents").getPublicUrl(path);
        documentUrl = publicUrl;
      }
    }
    const { error } = await supabase.from("employee_qualifications").insert({
      user_id: targetUserId, qualification_type: qualForm.qualification_type, title: qualForm.title,
      institution: qualForm.institution || null, field_of_study: qualForm.field_of_study || null,
      date_obtained: qualForm.date_obtained || null, document_url: documentUrl,
    });
    if (error) { toast.error(error.message); } else {
      await supabase.from("employee_audit_log").insert({ user_id: targetUserId, changed_by: user.id, change_type: "create", table_name: "employee_qualifications", new_data: qualForm });
      toast.success("Qualification added");
      setShowQualDialog(false);
      setQualForm({ qualification_type: "", title: "", institution: "", field_of_study: "", date_obtained: "" });
      loadAll();
    }
  };

  const uploadDocument = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !targetUserId || !user || !uploadDocType) {
      toast.error("Please select a document type and file");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${targetUserId}/documents/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("employee-documents").getPublicUrl(path);
    const { error } = await supabase.from("employee_documents").insert({
      user_id: targetUserId, document_type: uploadDocType, file_url: publicUrl,
      file_name: file.name, uploaded_by: user.id, description: uploadDescription || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Document uploaded"); setShowUploadDialog(false); setUploadDocType(""); setUploadDescription(""); loadAll(); }
    setUploading(false);
  };

  const deleteDocument = async (docId: string) => {
    const { error } = await supabase.from("employee_documents").delete().eq("id", docId);
    if (error) toast.error(error.message);
    else { toast.success("Document deleted"); loadAll(); }
  };

  const deleteQualification = async (qualId: string) => {
    if (!canManage) return;
    const { error } = await supabase.from("employee_qualifications").delete().eq("id", qualId);
    if (error) toast.error(error.message);
    else { toast.success("Qualification deleted"); loadAll(); }
  };

  const verifyQualification = async (qualId: string) => {
    if (!canManage || !user) return;
    const { error } = await supabase.from("employee_qualifications")
      .update({ verified: true, verified_by: user.id, verified_at: new Date().toISOString() })
      .eq("id", qualId);
    if (error) toast.error(error.message);
    else { toast.success("Qualification verified"); loadAll(); }
  };

  const generateExperienceLetter = async () => {
    if (!targetUserId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-experience", {
        body: { staffId: targetUserId, periodStart: letterForm.period_start || null, periodEnd: letterForm.period_end || null, letterType: letterForm.letter_type },
      });
      if (error) throw error;
      toast.success("Experience letter generated and submitted for approval");
      setShowLetterDialog(false);
      loadAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate letter");
    }
    setGenerating(false);
  };

  const approveLetterHR = async (letterId: string) => {
    if (!user) return;
    const { error } = await supabase.from("experience_letters")
      .update({ hr_approved: true, hr_approved_by: user.id, hr_approved_at: new Date().toISOString(), status: "pending_ceo" })
      .eq("id", letterId);
    if (error) toast.error(error.message);
    else { toast.success("Approved by HR"); loadAll(); }
  };

  const approveLetterCEO = async (letterId: string) => {
    if (!user) return;
    const { error } = await supabase.from("experience_letters")
      .update({ ceo_approved: true, ceo_approved_by: user.id, ceo_approved_at: new Date().toISOString(), status: "approved" })
      .eq("id", letterId);
    if (error) toast.error(error.message);
    else { toast.success("Approved by CEO — Letter is now official"); loadAll(); }
  };

  const rejectLetter = async (letterId: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    const { error } = await supabase.from("experience_letters")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", letterId);
    if (error) toast.error(error.message);
    else { toast.success("Letter rejected"); loadAll(); }
  };

  const handleExportPDF = (letter: any) => openExperienceLetterPDF(buildPdfData(letter));

  const buildPdfData = (letter: any): ExperienceLetterPDFData => ({
    staffName: profile?.full_name || "Unknown",
    position: profile?.position || empProfile?.hiring_position || "Staff",
    department: empProfile?.department || "",
    periodStart: letter.period_start || empProfile?.hiring_date || "",
    periodEnd: letter.period_end || format(new Date(), "yyyy-MM-dd"),
    content: letter.content || "",
    referenceNumber: `NGL-${letter.letter_type?.toUpperCase().slice(0, 3)}-${letter.id?.slice(0, 8).toUpperCase()}`,
    generatedData: letter.generated_data,
    letterType: letter.letter_type || "experience",
    approvedDate: letter.ceo_approved_at || letter.hr_approved_at,
  });

  const handleExportWord = (letter: any) => downloadAsWord(buildPdfData(letter));
  const handleExportExcel = (letter: any) => downloadAsExcel(buildPdfData(letter));

  const deleteLetter = async (letterId: string) => {
    if (!canManage) return;
    if (!confirm("Delete this letter permanently? This action cannot be undone.")) return;
    const { error } = await supabase.from("experience_letters" as any).delete().eq("id", letterId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("employee_audit_log").insert({
      user_id: targetUserId!, changed_by: user!.id,
      change_type: "delete", table_name: "experience_letters",
      old_data: { id: letterId } as any,
    });
    toast.success("Letter deleted");
    loadAll();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "draft": return "outline";
      case "pending_hr": return "secondary";
      case "pending_ceo": return "default";
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {profile?.full_name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile?.position || empProfile?.hiring_position || "No position set"}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {empProfile?.status && <Badge variant={empProfile.status === "active" ? "default" : "destructive"} className="text-xs capitalize">{empProfile.status}</Badge>}
                {empProfile?.hiring_date && <Badge variant="outline" className="text-xs">Hired: {empProfile.hiring_date}</Badge>}
                {empProfile?.department && <Badge variant="secondary" className="text-xs">{empProfile.department}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><User className="w-3.5 h-3.5 mr-1" />Profile</TabsTrigger>
          <TabsTrigger value="qualifications"><GraduationCap className="w-3.5 h-3.5 mr-1" />Qualifications</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="experience"><Sparkles className="w-3.5 h-3.5 mr-1" />Experience Letters</TabsTrigger>
          {canManage && <TabsTrigger value="audit"><Shield className="w-3.5 h-3.5 mr-1" />Audit Log</TabsTrigger>}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Employee Details</CardTitle>
              {(canManage || targetUserId === user?.id) && (
                <Button size="sm" variant="outline" onClick={() => setEditingEmpProfile(!editingEmpProfile)}>
                  <Edit className="w-3.5 h-3.5 mr-1" />{editingEmpProfile ? "Cancel" : "Edit"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingEmpProfile ? (
                <div className="grid md:grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium">Hiring Date</label><Input type="date" value={empForm.hiring_date || ""} onChange={e => setEmpForm({ ...empForm, hiring_date: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Department</label><Input value={empForm.department || ""} onChange={e => setEmpForm({ ...empForm, department: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Position at Hiring</label><Input value={empForm.hiring_position || ""} onChange={e => setEmpForm({ ...empForm, hiring_position: e.target.value })} /></div>
                  <div>
                    <label className="text-xs font-medium">Status</label>
                    <Select value={empForm.status || "active"} onValueChange={v => setEmpForm({ ...empForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs font-medium">National ID</label><Input value={empForm.national_id || ""} onChange={e => setEmpForm({ ...empForm, national_id: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Bank Account</label><Input value={empForm.bank_account || ""} onChange={e => setEmpForm({ ...empForm, bank_account: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Emergency Contact Name</label><Input value={empForm.emergency_contact_name || ""} onChange={e => setEmpForm({ ...empForm, emergency_contact_name: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Emergency Contact Phone</label><Input value={empForm.emergency_contact_phone || ""} onChange={e => setEmpForm({ ...empForm, emergency_contact_phone: e.target.value })} /></div>
                  {empForm.status === "resigned" && <div><label className="text-xs font-medium">Resignation Date</label><Input type="date" value={empForm.resignation_date || ""} onChange={e => setEmpForm({ ...empForm, resignation_date: e.target.value })} /></div>}
                  <div className="md:col-span-2"><label className="text-xs font-medium">Previous Experience</label><Textarea value={empForm.previous_experience || ""} onChange={e => setEmpForm({ ...empForm, previous_experience: e.target.value })} rows={3} placeholder="Experience before joining..." /></div>
                  <div className="md:col-span-2"><label className="text-xs font-medium">Notes</label><Textarea value={empForm.notes || ""} onChange={e => setEmpForm({ ...empForm, notes: e.target.value })} rows={2} /></div>
                  <div className="md:col-span-2"><Button onClick={saveEmpProfile}>Save Employee Profile</Button></div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  {[
                    ["Hiring Date", empProfile?.hiring_date || "Not set"],
                    ["Department", empProfile?.department || "Not set"],
                    ["Position at Hiring", empProfile?.hiring_position || "Not set"],
                    ["Status", empProfile?.status || "Not set"],
                    ["National ID", empProfile?.national_id || "Not set"],
                    ["Bank Account", empProfile?.bank_account || "Not set"],
                    ["Emergency Contact", empProfile?.emergency_contact_name ? `${empProfile.emergency_contact_name} (${empProfile.emergency_contact_phone || ""})` : "Not set"],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                  {empProfile?.previous_experience && (
                    <div className="md:col-span-2"><span className="text-muted-foreground text-xs">Previous Experience</span><p className="font-medium whitespace-pre-line">{empProfile.previous_experience}</p></div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Qualifications */}
        <TabsContent value="qualifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Qualifications & Certifications</h3>
            <Dialog open={showQualDialog} onOpenChange={setShowQualDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Add Qualification</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Qualification</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><label className="text-xs font-medium">Type *</label>
                    <Select value={qualForm.qualification_type} onValueChange={v => setQualForm({ ...qualForm, qualification_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{QUALIFICATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs font-medium">Title / Name *</label><Input value={qualForm.title} onChange={e => setQualForm({ ...qualForm, title: e.target.value })} placeholder="e.g., Computer Science" /></div>
                  <div><label className="text-xs font-medium">Institution</label><Input value={qualForm.institution} onChange={e => setQualForm({ ...qualForm, institution: e.target.value })} placeholder="e.g., Addis Ababa University" /></div>
                  <div><label className="text-xs font-medium">Field of Study</label><Input value={qualForm.field_of_study} onChange={e => setQualForm({ ...qualForm, field_of_study: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Date Obtained</label><Input type="date" value={qualForm.date_obtained} onChange={e => setQualForm({ ...qualForm, date_obtained: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Supporting Document</label><input ref={qualFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 text-sm" /></div>
                  <Button onClick={addQualification} className="w-full">Add Qualification</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {qualifications.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No qualifications recorded yet</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {qualifications.map((q: any) => (
                <Card key={q.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary" /></div>
                      <div>
                        <div className="font-medium text-sm">{q.qualification_type}: {q.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {q.institution && <span>{q.institution}</span>}{q.field_of_study && <span> · {q.field_of_study}</span>}{q.date_obtained && <span> · {q.date_obtained}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.verified ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
                      ) : canManage ? (
                        <Button size="sm" variant="outline" onClick={() => verifyQualification(q.id)}><CheckCircle className="w-3.5 h-3.5 mr-1" />Verify</Button>
                      ) : (
                        <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                      )}
                      {q.document_url && <Button size="sm" variant="ghost" asChild><a href={q.document_url} target="_blank" rel="noreferrer"><Eye className="w-3.5 h-3.5" /></a></Button>}
                      {canManage && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteQualification(q.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents — with type selection */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Documents (CV, Certificates, Transcripts, etc.)</h3>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Upload className="w-3.5 h-3.5 mr-1" />Upload Document</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Document Type *</label>
                    <Select value={uploadDocType} onValueChange={setUploadDocType}>
                      <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Description (optional)</label>
                    <Input value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder="e.g., BSc Certificate from AAU" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">File *</label>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="mt-1 text-sm w-full" />
                  </div>
                  <Button onClick={uploadDocument} disabled={uploading} className="w-full">
                    <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {documents.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No documents uploaded yet</CardContent></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.file_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{DOCUMENT_TYPES.find(dt => dt.value === d.document_type)?.label || d.document_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.description || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" asChild><a href={d.file_url} target="_blank" rel="noreferrer"><Eye className="w-3.5 h-3.5" /></a></Button>
                      {canManage && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDocument(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Experience Letters — with PDF/Word export */}
        <TabsContent value="experience" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">AI-Generated Experience Letters</h3>
            {canManage && (
              <Dialog open={showLetterDialog} onOpenChange={setShowLetterDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Sparkles className="w-3.5 h-3.5 mr-1" />Generate Letter</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Generate Experience Letter</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">Letter Type</label>
                      <Select value={letterForm.letter_type} onValueChange={v => setLetterForm({ ...letterForm, letter_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="experience">Experience Letter</SelectItem>
                          <SelectItem value="employment_verification">Employment Verification</SelectItem>
                          <SelectItem value="recommendation">Recommendation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-xs font-medium">Period Start (auto-fills from hiring date)</label><Input type="date" value={letterForm.period_start || empProfile?.hiring_date || ""} onChange={e => setLetterForm({ ...letterForm, period_start: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Period End</label><Input type="date" value={letterForm.period_end} onChange={e => setLetterForm({ ...letterForm, period_end: e.target.value })} /></div>
                    <p className="text-xs text-muted-foreground">AI analyzes all system data (projects, tasks, tickets, attendance, performance, qualifications) to generate a comprehensive letter.</p>
                    <Button onClick={generateExperienceLetter} disabled={generating} className="w-full">
                      <Sparkles className="w-4 h-4 mr-1" />{generating ? "Generating with AI..." : "Generate & Submit for Approval"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {letters.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No experience letters generated yet</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {letters.map((l: any) => (
                <Card key={l.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm capitalize">{l.letter_type?.replace(/_/g, " ")} Letter</div>
                        <div className="text-xs text-muted-foreground">{l.period_start} → {l.period_end} · Created {format(new Date(l.created_at), "MMM d, yyyy")}</div>
                      </div>
                      <Badge variant={statusColor(l.status) as any} className="text-xs capitalize">
                        {l.status === "pending_hr" ? "Awaiting HR" : l.status === "pending_ceo" ? "Awaiting CEO" : l.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs my-3">
                      <div className={`flex items-center gap-1 ${l.hr_approved ? "text-green-600" : "text-muted-foreground"}`}>
                        {l.hr_approved ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} HR Approval
                      </div>
                      <div className="w-8 h-px bg-border" />
                      <div className={`flex items-center gap-1 ${l.ceo_approved ? "text-green-600" : "text-muted-foreground"}`}>
                        {l.ceo_approved ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} CEO Approval
                      </div>
                      {l.status === "rejected" && <>
                        <div className="w-8 h-px bg-border" />
                        <div className="flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" />Rejected</div>
                      </>}
                    </div>

                    {l.rejection_reason && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded mb-2">Reason: {l.rejection_reason}</p>}

                    {l.generated_data?.statistics && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                        {[
                          ["Projects", l.generated_data.statistics.projectsParticipated],
                          ["Tasks", l.generated_data.statistics.tasksCompleted],
                          ["Tickets", l.generated_data.statistics.ticketsResolved],
                          ["Plans", l.generated_data.statistics.plansCompleted],
                          ["Work Hrs", l.generated_data.statistics.totalWorkHours],
                          ["Perf Pts", l.generated_data.statistics.totalPerformancePoints],
                        ].map(([label, val]) => (
                          <div key={label as string} className="text-center p-1.5 bg-muted/50 rounded">
                            <div className="text-sm font-bold">{val}</div>
                            <div className="text-[10px] text-muted-foreground">{label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {l.content && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-primary font-medium">View Letter Content</summary>
                        <pre className="mt-2 p-3 bg-muted rounded-lg whitespace-pre-wrap text-foreground max-h-64 overflow-y-auto">{l.content}</pre>
                      </details>
                    )}

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {l.status === "pending_hr" && isHR && <>
                        <Button size="sm" onClick={() => approveLetterHR(l.id)}><CheckCircle className="w-3.5 h-3.5 mr-1" />HR Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectLetter(l.id)}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
                      </>}
                      {l.status === "pending_ceo" && isCeo && <>
                        <Button size="sm" onClick={() => approveLetterCEO(l.id)}><CheckCircle className="w-3.5 h-3.5 mr-1" />CEO Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectLetter(l.id)}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
                      </>}
                      {l.status === "approved" && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Award className="w-3.5 h-3.5 mr-1" />Officially Approved</Badge>}

                      {/* Export buttons */}
                      <Button size="sm" variant="outline" onClick={() => handleExportPDF(l)}>
                        <Printer className="w-3.5 h-3.5 mr-1" />PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportWord(l)}>
                        <FileDown className="w-3.5 h-3.5 mr-1" />Word
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Audit Log */}
        {canManage && (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Change History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Table</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {auditLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{log.change_type}</Badge></TableCell>
                        <TableCell className="text-xs">{log.table_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.new_data ? JSON.stringify(log.new_data).slice(0, 80) + "..." : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {auditLogs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No audit records</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
