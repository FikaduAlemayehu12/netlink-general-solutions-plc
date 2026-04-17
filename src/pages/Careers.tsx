import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, Heart, Zap, Calendar, DollarSign, Upload, FileText, X, Loader2, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  created_at: string;
}

const benefitsList = [
  { icon: Users, label: "Team Culture", desc: "Collaborative, diverse team of certified professionals" },
  { icon: Zap, label: "Growth", desc: "International certification support and career advancement" },
  { icon: Heart, label: "Benefits", desc: "Competitive salary, health coverage, and leave policies" },
  { icon: Briefcase, label: "Impact", desc: "Shape Ethiopia's technological future every day" },
];

export default function Careers() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [form, setForm] = useState({ message: "" });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [signingIn, setSigningIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("job_vacancies" as any).select("*").eq("status", "published").eq("vacancy_type", "external").order("created_at", { ascending: false })
      .then(({ data }) => setVacancies((data || []) as any));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async (vacancyId: string) => {
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/careers",
      });
      if (result.error) {
        toast({ title: "Sign-in failed", description: String(result.error), variant: "destructive" });
      }
      if (result.redirected) {
        // Browser will redirect — store intended vacancy
        localStorage.setItem("apply_vacancy_id", vacancyId);
        return;
      }
      // Session set successfully — open apply form
      setApplyingId(vacancyId);
      setExpandedId(vacancyId);
    } catch (err: any) {
      toast({ title: "Sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setSigningIn(false);
    }
  };

  // After redirect, auto-open the vacancy the user intended to apply to
  useEffect(() => {
    if (user && !authLoading) {
      const pendingVacancy = localStorage.getItem("apply_vacancy_id");
      if (pendingVacancy) {
        localStorage.removeItem("apply_vacancy_id");
        setExpandedId(pendingVacancy);
        setApplyingId(pendingVacancy);
      }
    }
  }, [user, authLoading]);

  const handleApplyClick = (vacancyId: string) => {
    if (!user) {
      handleGoogleSignIn(vacancyId);
    } else {
      setApplyingId(vacancyId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or Word document", variant: "destructive" });
      return;
    }
    setCvFile(file);
  };

  const submitApplication = async (vacancy: Vacancy) => {
    if (!form.message.trim()) {
      toast({ title: "Cover letter required", description: "Please write a brief cover letter", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let cvUrl: string | null = null;
      if (cvFile) {
        const fileExt = cvFile.name.split(".").pop();
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("job-applications").upload(fileName, cvFile);
        if (uploadError) {
          toast({ title: "CV upload failed", description: uploadError.message, variant: "destructive" });
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("job-applications").getPublicUrl(fileName);
        cvUrl = urlData.publicUrl;
      }

      const applicantName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";
      const applicantEmail = user?.email || "";

      const { error } = await supabase.functions.invoke("handle-job-application", {
        body: {
          applicant_name: applicantName,
          applicant_email: applicantEmail,
          position: vacancy.title,
          cover_message: form.message.trim(),
          cv_url: cvUrl,
          vacancy_id: vacancy.id,
        },
      });
      if (error) throw error;

      setSubmittedIds(prev => new Set(prev).add(vacancy.id));
      setApplyingId(null);
      setForm({ message: "" });
      setCvFile(null);
      toast({ title: "Application submitted!", description: "We'll review your application and be in touch soon." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Please try again later", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const DetailSection = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{value}</p>
      </div>
    );
  };

  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-4">
              Join Our Team
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-primary-foreground mb-4">Careers</h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto">
              Be part of a mission to transform Ethiopia's technology landscape. We're growing fast.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-heading font-bold text-3xl text-center mb-10">Why Work with Us?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefitsList.map(({ icon: Icon, label, desc }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 bg-card rounded-xl border border-border shadow-card text-center">
                <div className="w-12 h-12 gradient-brand rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="font-heading font-semibold mb-2">{label}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Signed-in user indicator */}
      {user && (
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-heading font-bold text-xs">
              {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || user.email}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={async () => { await supabase.auth.signOut(); setUser(null); }}>
              Sign out
            </Button>
          </div>
        </div>
      )}

      {/* Open Positions */}
      <section className="py-16 bg-secondary/40">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-heading font-bold text-3xl mb-8">Open Positions</h2>
          {vacancies.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No open positions at the moment. Check back soon!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {vacancies.map((v, i) => {
                const isExpanded = expandedId === v.id;
                const isApplying = applyingId === v.id;
                const hasApplied = submittedIds.has(v.id);

                return (
                  <motion.div key={v.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                    className="bg-card rounded-xl border border-border shadow-card hover:border-cyan-brand/30 transition-all overflow-hidden">
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer" onClick={() => { setExpandedId(isExpanded ? null : v.id); if (isExpanded) setApplyingId(null); }}>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {v.department && <span className="text-xs px-2 py-0.5 bg-cyan-brand/10 text-cyan-brand rounded-full">{v.department}</span>}
                          <Badge variant="outline" className="text-xs">{v.employment_type}</Badge>
                          {v.location && <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{v.location}</span>}
                        </div>
                        <div className="font-heading font-semibold text-base">{v.title}</div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {v.openings > 0 && <span><Users className="w-3 h-3 inline mr-1" />{v.openings} opening{v.openings > 1 ? "s" : ""}</span>}
                          {v.deadline && <span><Calendar className="w-3 h-3 inline mr-1" />Deadline: {format(new Date(v.deadline), "MMM d, yyyy")}</span>}
                          {v.salary_range && <span><DollarSign className="w-3 h-3 inline mr-1" />{v.salary_range}</span>}
                        </div>
                      </div>
                      <button className="shrink-0 px-4 py-2 gradient-brand text-primary-foreground text-sm font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity">
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border">
                          <div className="px-5 py-4 space-y-3 bg-muted/30">
                            <DetailSection label="Job Description" value={v.description} />
                            <DetailSection label="Responsibilities" value={v.responsibilities} />
                            <DetailSection label="Qualifications" value={v.qualifications} />
                            <DetailSection label="Skills" value={v.skills} />
                            <DetailSection label="Experience" value={v.experience} />
                            <DetailSection label="Education" value={v.education} />
                            <DetailSection label="Certifications" value={v.certifications} />
                            <DetailSection label="Benefits" value={v.benefits} />
                            <DetailSection label="Working Hours" value={v.working_hours} />
                            <DetailSection label="Reporting Manager" value={v.reporting_manager} />
                          </div>

                          {/* Apply Section */}
                          <div className="px-5 py-4 border-t border-border bg-card">
                            {hasApplied ? (
                              <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/30 text-center justify-center">
                                <CheckCircle className="w-5 h-5 text-accent" />
                                <span className="font-heading font-semibold text-sm">Application Submitted Successfully!</span>
                              </div>
                            ) : !isApplying ? (
                              <Button onClick={(e) => { e.stopPropagation(); handleApplyClick(v.id); }}
                                disabled={signingIn} size="lg"
                                className="w-full gradient-brand text-primary-foreground font-heading font-semibold shadow-glow gap-2">
                                {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                                {!user ? "Sign in with Google to Apply" : "Apply Now"}
                              </Button>
                            ) : (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-[10px] font-bold">
                                    {(user?.user_metadata?.full_name || user?.email || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email}</span>
                                  <span className="text-xs text-muted-foreground">({user?.email})</span>
                                </div>

                                {/* CV Upload */}
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">CV / Resume (PDF or Word, max 10MB)</label>
                                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                                  {cvFile ? (
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-cyan-brand/30 bg-cyan-brand/5">
                                      <FileText className="w-5 h-5 text-cyan-brand flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{cvFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                      </div>
                                      <button type="button" onClick={() => { setCvFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-cyan-brand/40 bg-card text-sm text-muted-foreground hover:text-foreground transition-colors">
                                      <Upload className="w-4 h-4" /> Click to upload your CV
                                    </button>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Cover Letter / Message *</label>
                                  <textarea value={form.message} onChange={(e) => setForm({ message: e.target.value })} rows={4} placeholder="Tell us about yourself and why you're interested in this role..."
                                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                                </div>

                                <div className="flex gap-2">
                                  <Button variant="outline" className="flex-1" onClick={() => { setApplyingId(null); setForm({ message: "" }); setCvFile(null); }}>
                                    Cancel
                                  </Button>
                                  <Button onClick={() => submitApplication(v)} disabled={submitting}
                                    className="flex-1 gradient-brand text-primary-foreground font-heading shadow-glow gap-2">
                                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Application"}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
