import { useState } from "react";
import { Mail, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SubscribeForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("subscriber_emails").insert({
      email: email.trim().toLowerCase(),
      user_id: user?.id ?? null,
    });
    setLoading(false);
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Subscription failed", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    setEmail("");
    toast({ title: "Subscribed!", description: "Thanks for joining our newsletter." });
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="w-4 h-4" /> You're subscribed!
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-sm">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-primary-foreground placeholder:text-primary-foreground/30 outline-none focus:border-cyan-brand/50"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg gradient-brand text-primary-foreground text-sm font-heading font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
      </button>
    </form>
  );
}
