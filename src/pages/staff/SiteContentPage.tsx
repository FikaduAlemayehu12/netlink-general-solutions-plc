import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Newspaper, Star, Search, Upload, X, FileText, Loader2, Globe, Users, Lock } from "lucide-react";
import StaffLayout from "@/components/staff/StaffLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";

interface SiteContent {
  id: string;
  content_type: string;
  title: string;
  content: string | null;
  attachment_urls: string[];
  audience: string;
  status: string;
  author_id: string;
  client_name: string | null;
  client_company: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  content_type: "news", title: "", content: "", audience: "both", status: "draft",
  client_name: "", client_company: "", rating: 5,
};

const TYPE_ICONS: Record<string, any> = { news: Newspaper, testimonial: Star, gallery: Image };
const AUDIENCE_ICONS: Record<string, any> = { staff: Lock, client: Globe, both: Users };

export default function SiteContentPage() {
  const { user, isCeo } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<SiteContent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("site_content" as any).select("*").order("created_at", { ascending: false });
    setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(selected)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("site-content").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("site-content").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    setFiles(prev => [...prev, ...newUrls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim() || !user) return;
    const payload: any = {
      content_type: form.content_type, title: form.title, content: form.content || null,
      audience: form.audience, status: form.status, attachment_urls: files, author_id: user.id,
      client_name: form.content_type === "testimonial" ? form.client_name || null : null,
      client_company: form.content_type === "testimonial" ? form.client_company || null : null,
      rating: form.content_type === "testimonial" ? form.rating : null,
    };

    if (editingId) {
      delete payload.author_id;
      await supabase.from("site_content" as any).update(payload).eq("id", editingId);
      logActivity("update", "announcements" as any, editingId, "site_content", { title: form.title, content_type: form.content_type });
      toast({ title: "Content updated" });
    } else {
      await supabase.from("site_content" as any).insert(payload);
      logActivity("create", "announcements" as any, undefined, "site_content", { title: form.title, content_type: form.content_type, audience: form.audience });
      toast({ title: "Content created" });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFiles([]);
    load();
  };

  const handleEdit = (item: SiteContent) => {
    setEditingId(item.id);
    setForm({
      content_type: item.content_type, title: item.title, content: item.content || "",
      audience: item.audience, status: item.status,
      client_name: item.client_name || "", client_company: item.client_company || "",
      rating: item.rating || 5,
    });
    setFiles(item.attachment_urls || []);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const item = items.find(x => x.id === deleteId);
    await supabase.from("site_content" as any).delete().eq("id", deleteId);
    logActivity("delete", "announcements" as any, deleteId, "site_content", { title: item?.title });
    toast({ title: "Content deleted" });
    setDeleteId(null);
    load();
  };

  const toggleStatus = async (item: SiteContent) => {
    const newStatus = item.status === "published" ? "draft" : "published";
    await supabase.from("site_content" as any).update({ status: newStatus }).eq("id", item.id);
    toast({ title: `Content ${newStatus}` });
    load();
  };

  const filtered = items.filter(item => {
    if (tab !== "all" && item.content_type !== tab) return false;
    if (search) return item.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl">Site Content</h1>
            <p className="text-sm text-muted-foreground">Manage news, testimonials, and galleries</p>
          </div>
          {isCeo && (
            <Button onClick={() => { setEditingId(null); setForm(emptyForm); setFiles([]); setDialogOpen(true); }} className="gradient-brand text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> New Content
            </Button>
          )}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="testimonial">Testimonials</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No content found</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, i) => {
              const TypeIcon = TYPE_ICONS[item.content_type] || Newspaper;
              const AudIcon = AUDIENCE_ICONS[item.audience] || Globe;
              const coverImage = (item.attachment_urls || []).find(isImage);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-cyan-brand/30 transition-all shadow-sm">
                  {coverImage && (
                    <div className="h-40 bg-muted overflow-hidden cursor-pointer" onClick={() => setViewItem(item)}>
                      <img src={coverImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="gap-1 text-xs"><TypeIcon className="w-3 h-3" />{item.content_type}</Badge>
                      <Badge variant={item.status === "published" ? "default" : "outline"} className="text-xs">{item.status}</Badge>
                      <Badge variant="outline" className="gap-1 text-xs"><AudIcon className="w-3 h-3" />{item.audience}</Badge>
                    </div>
                    <h3 className="font-heading font-semibold text-sm cursor-pointer hover:text-primary" onClick={() => setViewItem(item)}>{item.title}</h3>
                    {item.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>}
                    {item.content_type === "testimonial" && item.client_name && (
                      <p className="text-xs text-cyan-brand mt-1">— {item.client_name}{item.client_company ? `, ${item.client_company}` : ""}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                      {isCeo && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleStatus(item)}>
                            {item.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={o => { if (!o) setViewItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewItem && (
            <>
              <DialogHeader><DialogTitle className="font-heading">{viewItem.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{viewItem.content_type}</Badge>
                  <Badge variant="outline" className="capitalize">{viewItem.audience}</Badge>
                  <Badge>{viewItem.status}</Badge>
                </div>
                {viewItem.content && <p className="text-sm whitespace-pre-wrap">{viewItem.content}</p>}
                {viewItem.content_type === "testimonial" && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{viewItem.client_name}</p>
                    {viewItem.client_company && <p className="text-xs text-muted-foreground">{viewItem.client_company}</p>}
                    {viewItem.rating && <p className="text-sm mt-1">{"⭐".repeat(viewItem.rating)}</p>}
                  </div>
                )}
                {(viewItem.attachment_urls || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Attachments</p>
                    <div className="grid grid-cols-2 gap-2">
                      {viewItem.attachment_urls.map((url, i) => isImage(url) ? (
                        <img key={i} src={url} alt="" className="rounded-lg w-full h-40 object-cover" />
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted text-sm">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="truncate">{url.split("/").pop()}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editingId ? "Edit Content" : "New Content"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Type *</label>
                <Select value={form.content_type} onValueChange={v => handleChange("content_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="testimonial">Testimonial</SelectItem>
                    <SelectItem value="gallery">Gallery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Audience *</label>
                <Select value={form.audience} onValueChange={v => handleChange("audience", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Staff + Clients)</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                    <SelectItem value="client">Clients Only</SelectItem>
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
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => handleChange("title", e.target.value)} placeholder="Content title..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <Textarea value={form.content} onChange={e => handleChange("content", e.target.value)} rows={4} placeholder="Write your content..." />
            </div>

            {form.content_type === "testimonial" && (
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Client Name</label>
                  <Input value={form.client_name} onChange={e => handleChange("client_name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Company</label>
                  <Input value={form.client_company} onChange={e => handleChange("client_company", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Rating (1-5)</label>
                  <Input type="number" min={1} max={5} value={form.rating} onChange={e => handleChange("rating", parseInt(e.target.value) || 5)} />
                </div>
              </div>
            )}

            {/* Attachments */}
            <div>
              <label className="text-sm font-medium mb-1 block">Attachments</label>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.zip" onChange={handleFileUpload} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-cyan-brand/40 bg-card text-sm text-muted-foreground transition-colors">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload files (images, PDFs, ZIPs)</>}
              </button>
              {files.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {files.map((url, i) => (
                    <div key={i} className="relative group">
                      {isImage(url) ? (
                        <img src={url} alt="" className="rounded-lg w-full h-24 object-cover" />
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{url.split("/").pop()}</span>
                        </div>
                      )}
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSave} className="w-full gradient-brand text-primary-foreground font-heading">
              {editingId ? "Update Content" : "Create Content"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this content?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
