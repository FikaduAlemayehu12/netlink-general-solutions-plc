import { supabase } from "@/integrations/supabase/client";

export type ActivityModule = "tickets" | "plans" | "projects" | "messages" | "leave" | "attendance" | "salary" | "team" | "announcements" | "settings";
export type ActivityAction = "create" | "update" | "delete" | "assign" | "upload" | "comment" | "status_change" | "approve" | "reject";

export async function logActivity(
  action: ActivityAction,
  module: ActivityModule,
  targetId?: string,
  targetType?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_logs" as any).insert({
      user_id: user.id,
      action,
      module,
      target_id: targetId || null,
      target_type: targetType || null,
      details: details || {},
    } as any);
  } catch (e) {
    // Silent fail — don't break user flow for logging
    console.warn("Activity log failed:", e);
  }
}
