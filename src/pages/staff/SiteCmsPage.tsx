import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import StaffLayout from "@/components/staff/StaffLayout";
import StaffGuard from "@/components/staff/StaffGuard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, ImagePlus, Save, ArrowUp, ArrowDown, Loader2, ShieldAlert } from "lucide-react";

interface Slide {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  cta_label: string | null;
  cta_link: string | null;
  display_order: number;
  is_active: boolean;
}

interface Settings {
  id?: string;
  company_name: string;
  company_tagline: string | null;
  logo_url: string | null;
  vision: string | null;
  mission: string | null;
  core_values: string | null;
  welcome_message: string | null;
  founder_name: string | null;
  founder_title: string | null;
  founder_message: string | null;
  founder_photo_url: string | null;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface Stat {
  id: string;
  label: string;
  value: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

const MODULES = [
  { key: "slides", label: "Slider" },
  { key: "identity", label: "Identity" },
  { key: "partners", label: "Partners" },
  { key: "stats", label: "Stats" },
];

function SiteCmsPageInner() {
  const { user, isCeo } = useAuth();
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("slides");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("module_permissions" as any)
      .select("module")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const set = new Set<string>();
        if (Array.isArray(data)) data.forEach((r: any) => set.add(r.module));
        if (isCeo) MODULES.forEach((m) => set.add(m.key));
        setPerms(set);
        setLoading(false);
      });
  }, [user, isCeo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCeo && perms.size === 0) {
    return (
      <Card className="p-10 text-center">
        <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-4" />
        <h2 className="font-heading font-bold text-xl mb-2">No CMS access</h2>
        <p className="text-muted-foreground text-sm">
          Ask the CEO to grant you module permissions in User Management before you can edit the public site.
        </p>
      </Card>
    );
  }

  const allowed = (m: string) => perms.has(m);
  const firstAllowed = MODULES.find((m) => allowed(m.key))?.key ?? "slides";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading font-bold text-3xl mb-1">Site CMS</h1>
        <p className="text-muted-foreground text-sm">
          Manage everything visitors see on the public website. {isCeo ? "(CEO — full access)" : `(Modules: ${[...perms].join(", ")})`}
        </p>
      </motion.div>

      <Tabs value={allowed(tab) ? tab : firstAllowed} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          {MODULES.map((m) => (
            <TabsTrigger key={m.key} value={m.key} disabled={!allowed(m.key)}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="slides"><SlidesEditor /></TabsContent>
        <TabsContent value="identity"><IdentityEditor /></TabsContent>
        <TabsContent value="partners"><PartnersEditor /></TabsContent>
        <TabsContent value="stats"><StatsEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- SLIDES EDITOR ---------- */
function SlidesEditor() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_slides" as any)
      .select("*")
      .order("display_order", { ascending: true });
    setSlides((data as unknown as Slide[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `slides/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file);
    setUploading(false);
    if (error) { toast.error("Upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    return data.publicUrl;
  };

  const addSlide = async () => {
    const max = slides.reduce((m, s) => Math.max(m, s.display_order), 0);
    const { error } = await supabase.from("site_slides" as any).insert({
      image_url: "/src/assets/slides/welcome-hero.jpg",
      title: "New Slide",
      caption: "Edit this caption from the CMS.",
      cta_label: "Learn More",
      cta_link: "/about",
      display_order: max + 1,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Slide added");
    load();
  };

  const updateSlide = async (id: string, patch: Partial<Slide>) => {
    const { error } = await supabase.from("site_slides" as any).update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSlides((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    const { error } = await supabase.from("site_slides" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Slide deleted");
    setSlides((s) => s.filter((x) => x.id !== id));
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const swap = slides[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("site_slides" as any).update({ display_order: swap.display_order }).eq("id", id),
      supabase.from("site_slides" as any).update({ display_order: slides[idx].display_order }).eq("id", swap.id),
    ]);
    load();
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{slides.length} slides — they auto-rotate every 5s on the homepage.</p>
        <Button onClick={addSlide} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Slide</Button>
      </div>

      <div className="space-y-3">
        {slides.map((slide, i) => (
          <Card key={slide.id} className="p-4">
            <div className="grid md:grid-cols-[180px_1fr_auto] gap-4">
              <div className="relative">
                <img src={slide.image_url.startsWith("/src") ? slide.image_url : slide.image_url} alt="" className="w-full h-28 object-cover rounded-md bg-muted" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/60 text-white opacity-0 hover:opacity-100 transition cursor-pointer rounded-md">
                  <ImagePlus className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await upload(f);
                    if (url) updateSlide(slide.id, { image_url: url });
                  }} />
                </label>
              </div>
              <div className="space-y-2">
                <Input placeholder="Title" value={slide.title ?? ""} onChange={(e) => updateSlide(slide.id, { title: e.target.value })} />
                <Textarea placeholder="Caption" rows={2} value={slide.caption ?? ""} onChange={(e) => updateSlide(slide.id, { caption: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="CTA label" value={slide.cta_label ?? ""} onChange={(e) => updateSlide(slide.id, { cta_label: e.target.value })} />
                  <Input placeholder="CTA link (e.g. /contact)" value={slide.cta_link ?? ""} onChange={(e) => updateSlide(slide.id, { cta_link: e.target.value })} />
                </div>
              </div>
              <div className="flex md:flex-col gap-2 items-center justify-end">
                <div className="flex items-center gap-2">
                  <Switch checked={slide.is_active} onCheckedChange={(v) => updateSlide(slide.id, { is_active: v })} />
                  <span className="text-xs text-muted-foreground">{slide.is_active ? "Live" : "Hidden"}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" disabled={i === 0} onClick={() => move(slide.id, -1)}><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="outline" disabled={i === slides.length - 1} onClick={() => move(slide.id, 1)}><ArrowDown className="w-4 h-4" /></Button>
                  <Button size="icon" variant="destructive" onClick={() => removeSlide(slide.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {uploading && <p className="text-xs text-muted-foreground"><Loader2 className="inline w-3 h-3 animate-spin mr-1" /> Uploading…</p>}
    </div>
  );
}

/* ---------- IDENTITY EDITOR ---------- */
function IdentityEditor() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings" as any).select("*").limit(1).single().then(({ data }) => {
      if (data) setS(data as unknown as Settings);
    });
  }, []);

  const upload = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings" as any).update({
      company_name: s.company_name,
      company_tagline: s.company_tagline,
      logo_url: s.logo_url,
      vision: s.vision,
      mission: s.mission,
      core_values: s.core_values,
      welcome_message: s.welcome_message,
      founder_name: s.founder_name,
      founder_title: s.founder_title,
      founder_message: s.founder_message,
      founder_photo_url: s.founder_photo_url,
    }).eq("id", s.id!);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (!s) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-6 mt-4">
      <Card className="p-5 space-y-4">
        <h3 className="font-heading font-semibold">Company Identity</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Company name</Label><Input value={s.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
          <div><Label>Tagline</Label><Input value={s.company_tagline ?? ""} onChange={(e) => set("company_tagline", e.target.value)} /></div>
        </div>
        <div>
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {s.logo_url && <img src={s.logo_url} alt="logo" className="w-16 h-16 rounded-md bg-muted object-contain" />}
            <input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const url = await upload(f, "logo");
              if (url) set("logo_url", url);
            }} />
          </div>
        </div>
        <div><Label>Welcome message (homepage)</Label><Textarea rows={3} value={s.welcome_message ?? ""} onChange={(e) => set("welcome_message", e.target.value)} /></div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-heading font-semibold">Vision · Mission · Values</h3>
        <div><Label>Vision</Label><Textarea rows={2} value={s.vision ?? ""} onChange={(e) => set("vision", e.target.value)} /></div>
        <div><Label>Mission</Label><Textarea rows={2} value={s.mission ?? ""} onChange={(e) => set("mission", e.target.value)} /></div>
        <div><Label>Core values</Label><Textarea rows={2} value={s.core_values ?? ""} onChange={(e) => set("core_values", e.target.value)} /></div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-heading font-semibold">Founder's Message</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Founder name</Label><Input value={s.founder_name ?? ""} onChange={(e) => set("founder_name", e.target.value)} /></div>
          <div><Label>Founder title</Label><Input value={s.founder_title ?? ""} onChange={(e) => set("founder_title", e.target.value)} /></div>
        </div>
        <div><Label>Message</Label><Textarea rows={4} value={s.founder_message ?? ""} onChange={(e) => set("founder_message", e.target.value)} /></div>
        <div>
          <Label>Founder photo</Label>
          <div className="flex items-center gap-3">
            {s.founder_photo_url && <img src={s.founder_photo_url} alt="" className="w-16 h-16 rounded-full object-cover bg-muted" />}
            <input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const url = await upload(f, "founder");
              if (url) set("founder_photo_url", url);
            }} />
          </div>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Identity
      </Button>
    </div>
  );
}

/* ---------- PARTNERS EDITOR ---------- */
function PartnersEditor() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("site_partners" as any).select("*").order("display_order", { ascending: true });
    setItems((data as unknown as Partner[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const max = items.reduce((m, p) => Math.max(m, p.display_order), 0);
    await supabase.from("site_partners" as any).insert({ name: "New Partner", display_order: max + 1 });
    toast.success("Partner added");
    load();
  };
  const update = async (id: string, patch: Partial<Partner>) => {
    await supabase.from("site_partners" as any).update(patch).eq("id", id);
    setItems((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const remove = async (id: string) => {
    if (!confirm("Delete partner?")) return;
    await supabase.from("site_partners" as any).delete().eq("id", id);
    setItems((s) => s.filter((x) => x.id !== id));
  };
  const upload = async (id: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `partners/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    update(id, { logo_url: data.publicUrl });
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} partners</p>
        <Button onClick={add} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Partner</Button>
      </div>
      {items.map((p) => (
        <Card key={p.id} className="p-4 grid md:grid-cols-[100px_1fr_auto] gap-4">
          <div className="relative">
            {p.logo_url ? <img src={p.logo_url} alt={p.name} className="w-full h-20 object-contain rounded bg-muted" /> : <div className="w-full h-20 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">No logo</div>}
            <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/60 text-white opacity-0 hover:opacity-100 transition cursor-pointer rounded">
              <ImagePlus className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(p.id, f); }} />
            </label>
          </div>
          <div className="space-y-2">
            <Input placeholder="Partner name" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
            <Input placeholder="Website URL" value={p.website_url ?? ""} onChange={(e) => update(p.id, { website_url: e.target.value })} />
            <Textarea placeholder="Short description" rows={2} value={p.description ?? ""} onChange={(e) => update(p.id, { description: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Switch checked={p.is_active} onCheckedChange={(v) => update(p.id, { is_active: v })} />
            <Button size="icon" variant="destructive" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- STATS EDITOR ---------- */
function StatsEditor() {
  const [items, setItems] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("site_stats" as any).select("*").order("display_order", { ascending: true });
    setItems((data as unknown as Stat[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const max = items.reduce((m, p) => Math.max(m, p.display_order), 0);
    await supabase.from("site_stats" as any).insert({ label: "New stat", value: "0", display_order: max + 1 });
    load();
  };
  const update = async (id: string, patch: Partial<Stat>) => {
    await supabase.from("site_stats" as any).update(patch).eq("id", id);
    setItems((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const remove = async (id: string) => {
    if (!confirm("Delete stat?")) return;
    await supabase.from("site_stats" as any).delete().eq("id", id);
    setItems((s) => s.filter((x) => x.id !== id));
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} stats shown on homepage</p>
        <Button onClick={add} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Stat</Button>
      </div>
      {items.map((s) => (
        <Card key={s.id} className="p-4 grid md:grid-cols-[1fr_1fr_140px_auto] gap-3 items-center">
          <Input placeholder="Value (e.g. 20+)" value={s.value} onChange={(e) => update(s.id, { value: e.target.value })} />
          <Input placeholder="Label" value={s.label} onChange={(e) => update(s.id, { label: e.target.value })} />
          <Input placeholder="Icon (Users)" value={s.icon ?? ""} onChange={(e) => update(s.id, { icon: e.target.value })} />
          <div className="flex gap-2 items-center">
            <Switch checked={s.is_active} onCheckedChange={(v) => update(s.id, { is_active: v })} />
            <Button size="icon" variant="destructive" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function SiteCmsPage() {
  return (
    <StaffGuard>
      <StaffLayout>
        <SiteCmsPageInner />
      </StaffLayout>
    </StaffGuard>
  );
}
