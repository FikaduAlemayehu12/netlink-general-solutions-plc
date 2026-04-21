import { useState, useEffect } from "react";
import { Users, Eye, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VisitorCounter() {
  const [total, setTotal] = useState<number | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [subscribers, setSubscribers] = useState<number | null>(null);

  useEffect(() => {
    const getOrCreateHash = () => {
      let hash = localStorage.getItem("visitor_hash");
      if (!hash) {
        hash = crypto.randomUUID();
        localStorage.setItem("visitor_hash", hash);
      }
      return hash;
    };

    const hash = getOrCreateHash();

    const refresh = async () => {
      const [trackRes, onlineRes, subsRes] = await Promise.all([
        supabase.rpc("track_visitor" as any, { p_hash: hash }),
        supabase.rpc("get_online_count" as any),
        supabase.rpc("get_subscriber_count" as any),
      ]);
      if (typeof trackRes.data === "number") setTotal(trackRes.data);
      if (typeof onlineRes.data === "number") setOnline(onlineRes.data);
      if (typeof subsRes.data === "number") setSubscribers(subsRes.data);
    };

    const ping = async () => {
      await supabase.rpc("ping_online" as any, { p_hash: hash });
      const { data } = await supabase.rpc("get_online_count" as any);
      if (typeof data === "number") setOnline(data);
    };

    refresh();
    const pingInterval = setInterval(ping, 60_000); // every minute

    return () => clearInterval(pingInterval);
  }, []);

  if (total === null) return null;

  return (
    <div className="flex items-center gap-4 text-primary-foreground/60 text-xs">
      {online !== null && (
        <span className="flex items-center gap-1.5">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75" />
            <span className="relative rounded-full w-2 h-2 bg-green-500" />
          </span>
          <span className="font-heading font-bold text-green-400">{online}</span> online
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-cyan-brand" />
        <span className="font-heading font-bold text-cyan-brand">{total.toLocaleString()}</span> visitors
      </span>
      {subscribers !== null && subscribers > 0 && (
        <span className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span className="font-heading font-bold text-primary">{subscribers}</span> subscribers
        </span>
      )}
    </div>
  );
}
