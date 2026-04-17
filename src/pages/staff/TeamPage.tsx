import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare } from "lucide-react";
import StaffLayout from "@/components/staff/StaffLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/supabase";
import type { AppRole } from "@/lib/supabase";

export default function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap: Record<string, AppRole[]> = {};
      for (const r of rolesData || []) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role as AppRole);
      }
      setProfiles(profilesData || []);
      setUserRoles(roleMap);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <StaffLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />Team Directory
          </h1>
          <p className="text-muted-foreground text-sm">{profiles.length} staff members</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const roles = userRoles[p.user_id] || [];
              const primaryRole = roles[0] as AppRole | undefined;
              return (
                <Card key={p.id} className="hover:shadow-card transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold font-heading text-lg flex-shrink-0">
                        {p.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-foreground text-sm truncate">{p.full_name}</div>
                        <div className="text-muted-foreground text-xs mt-0.5 truncate">{p.position || "Staff"}</div>
                        {primaryRole && (
                          <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-semibold ${ROLE_COLORS[primaryRole]}`}>
                            {ROLE_LABELS[primaryRole]}
                          </span>
                        )}
                        <div className="mt-2 text-[10px] text-muted-foreground font-mono truncate">{p.email}</div>
                      </div>
                    </div>
                    {p.bio && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>}
                    {p.user_id !== user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: '/staff/messages', search: { partner: p.user_id } });
                        }}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Send Message
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
