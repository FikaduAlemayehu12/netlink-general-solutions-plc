import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Save, Phone, Calendar, FileText } from "lucide-react";
import StaffLayout from "@/components/staff/StaffLayout";
import { ROLE_LABELS } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";

export default function ProfilePage() {
  const { profile, roles, isCeo, refreshProfile, user } = useAuth();
  const [form, setForm] = useState({ full_name: "", position: "", bio: "", phone: "", birthday: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        position: profile.position || "",
        bio: profile.bio || "",
        phone: (profile as any).phone || "",
        birthday: (profile as any).birthday || "",
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    // Delete old avatar if exists
    await supabase.storage.from("avatars").remove([path]);

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // Add cache-busting param
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      setAvatarUrl(url);
      await refreshProfile();
    }
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const updateData: any = { bio: form.bio, phone: form.phone, birthday: form.birthday || null };
    // Only CEO can edit their own name
    if (isCeo) {
      updateData.full_name = form.full_name;
    }
    await supabase.from("profiles").update(updateData).eq("user_id", user.id);
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const primaryRole = roles[0] as AppRole | undefined;

  return (
    <StaffLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">My Profile</h1>
        <Card>
          <CardContent className="p-6">
            {/* Avatar + Info */}
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-border">
              <div className="relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                  <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold font-heading text-2xl">
                    {profile?.full_name?.charAt(0) || "?"}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <div className="font-heading font-bold text-xl text-foreground">{profile?.full_name}</div>
                <div className="text-muted-foreground text-sm">{profile?.email}</div>
                {primaryRole && (
                  <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-heading font-semibold bg-primary/10 text-primary">
                    {ROLE_LABELS[primaryRole]}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Full Name - Only CEO can edit */}
              <div>
                <label className="text-sm font-medium font-heading text-foreground">Full Name</label>
                {isCeo ? (
                  <Input className="mt-1.5" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
                ) : (
                  <div className="mt-1.5 px-3 py-2 text-sm bg-muted rounded-md text-muted-foreground">{form.full_name}
                    <span className="text-xs ml-2 opacity-60">(Contact CEO to change)</span>
                  </div>
                )}
              </div>

              {/* Position - Read only */}
              <div>
                <label className="text-sm font-medium font-heading text-foreground">Position</label>
                <div className="mt-1.5 px-3 py-2 text-sm bg-muted rounded-md text-muted-foreground">{form.position || "Not set"}
                  <span className="text-xs ml-2 opacity-60">(Set by admin)</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm font-medium font-heading text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Birthday */}
              <div>
                <label className="text-sm font-medium font-heading text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />Birthday
                </label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={form.birthday}
                  onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-medium font-heading text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />Contact Number
                </label>
                <Input
                  type="tel"
                  className="mt-1.5"
                  placeholder="+251 9XX XXX XXXX"
                  value={form.phone}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val && !val.startsWith("+251") && !val.startsWith("+")) {
                      val = "+251" + val;
                    }
                    setForm((f) => ({ ...f, phone: val }));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Ethiopian format: +251 9XX XXX XXXX</p>
              </div>

              <Button onClick={save} disabled={saving} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow">
                <Save className="w-4 h-4" />{saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
