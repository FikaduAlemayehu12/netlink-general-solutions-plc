import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Network, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-yellow-400", "bg-green-500", "bg-green-600"];
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-border"}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? "text-green-500" : "text-muted-foreground"}`}>
            <CheckCircle className="w-3 h-3" />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const isStrong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^a-zA-Z0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isStrong) { setError("Password does not meet strength requirements."); return; }
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setError("No authenticated user found."); setLoading(false); return; }

      // 1. Change password first
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { setError(updateError.message); setLoading(false); return; }

      // 2. Update profile flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("user_id", currentUser.id);
      if (profileError) { setError("Failed to update profile: " + profileError.message); setLoading(false); return; }

      // 3. Wait for profile refresh to complete before navigating
      await refreshProfile();
      
      // 4. Small delay to let auth state settle, then navigate
      setTimeout(() => navigate({ to: "/staff/dashboard", replace: true }), 300);
    } catch (err: any) {
      console.error("Password change error:", err);
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 network-pattern opacity-30" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shadow-glow">
              <Network className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="font-heading font-bold text-2xl text-primary-foreground tracking-wide">NETLINK</div>
              <div className="text-xs text-cyan-brand tracking-widest">GENERAL SOLUTIONS</div>
            </div>
          </div>
          <h1 className="text-primary-foreground font-heading text-2xl font-bold">Set Your Password</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">You must set a new secure password before continuing.</p>
        </div>
        <div className="bg-card/10 backdrop-blur-md border border-cyan-brand/20 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-primary-foreground/80 text-sm font-medium font-heading">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter strong password" className="pl-10 bg-white/5 border-white/10 text-primary-foreground placeholder:text-primary-foreground/30" required />
              </div>
              {newPassword && <PasswordStrength password={newPassword} />}
            </div>
            <div className="space-y-1.5">
              <label className="text-primary-foreground/80 text-sm font-medium font-heading">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm your password" className="pl-10 bg-white/5 border-white/10 text-primary-foreground placeholder:text-primary-foreground/30" required />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={loading || !isStrong} className="w-full gradient-brand text-primary-foreground font-heading font-semibold h-11 shadow-glow hover:opacity-90">
              {loading ? "Updating…" : "Set Password & Continue"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
