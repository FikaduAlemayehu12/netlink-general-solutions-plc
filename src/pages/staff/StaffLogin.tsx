import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Network, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/staff/dashboard", replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.endsWith("@netlink-gs.com")) {
      setError("Please use your official company email (firstname@netlink-gs.com)");
      return;
    }
    setLoading(true);
    try {
      // Sign out any existing session first to avoid lock issues
      await supabase.auth.signOut();
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError("Invalid credentials. Please check your email and password.");
        setLoading(false);
      } else {
        window.location.href = "/staff/dashboard";
      }
    } catch (err) {
      console.error("[LOGIN] Error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 network-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light/20 to-navy" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shadow-glow">
              <Network className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="font-heading font-bold text-2xl text-primary-foreground tracking-wide">NETLINK</div>
              <div className="text-xs text-cyan-brand tracking-widest font-medium">GENERAL SOLUTIONS</div>
            </div>
          </div>
          <h1 className="text-primary-foreground font-heading text-2xl font-bold mt-2">Staff Portal</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Sign in with your company credentials</p>
        </div>

        {/* Card */}
        <div className="bg-card/10 backdrop-blur-md border border-cyan-brand/20 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-primary-foreground/80 text-sm font-medium font-heading">Company Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                <Input
                  type="email"
                  placeholder="firstname@netlink-gs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-primary-foreground placeholder:text-primary-foreground/30 focus-visible:ring-cyan-brand/50"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-primary-foreground/80 text-sm font-medium font-heading">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-primary-foreground placeholder:text-primary-foreground/30 focus-visible:ring-cyan-brand/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/40 hover:text-primary-foreground/70"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-brand text-primary-foreground font-heading font-semibold h-11 text-base shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

        </div>

        {/* Back to website */}
        <div className="text-center mt-6">
          <a href="/" className="text-primary-foreground/40 text-sm hover:text-cyan-brand transition-colors">
            ← Back to Public Website
          </a>
        </div>
      </motion.div>
    </div>
  );
}
