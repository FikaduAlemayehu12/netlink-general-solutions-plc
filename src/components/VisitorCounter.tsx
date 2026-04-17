import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const getOrCreateHash = () => {
      let hash = localStorage.getItem("visitor_hash");
      if (!hash) {
        hash = crypto.randomUUID();
        localStorage.setItem("visitor_hash", hash);
      }
      return hash;
    };

    const track = async () => {
      const hash = getOrCreateHash();
      const { data } = await supabase.rpc("track_visitor" as any, { p_hash: hash });
      if (typeof data === "number") setCount(data);
    };

    track();

    // Listen for new visitors in realtime
    const channel = supabase
      .channel("visitor-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visitor_log" }, () => {
        setCount(prev => (prev !== null ? prev + 1 : prev));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-2 text-primary-foreground/60 text-sm">
      <Users className="w-4 h-4 text-cyan-brand" />
      <span>
        <span className="font-heading font-bold text-cyan-brand">{count.toLocaleString()}</span> visitors
      </span>
    </div>
  );
}
