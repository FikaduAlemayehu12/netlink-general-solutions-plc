import { supabase } from "@/integrations/supabase/client";

export type ActivityModule =
  | "tickets" | "plans" | "projects" | "messages" | "leave"
  | "attendance" | "salary" | "team" | "announcements" | "settings"
  | "hr" | "users" | "vacancies" | "applications" | "site_content" | "recycle_bin";

export type ActivityAction =
  | "create" | "update" | "delete" | "assign" | "upload"
  | "comment" | "status_change" | "approve" | "reject" | "restore";

export async function logActivity(
  action: ActivityAction,
  module: ActivityModule,
  recordId?: string,
  recordType?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      module,
      record_id: recordId || null,
      record_type: recordType || null,
      details: details || {},
    });
  } catch (e) {
    // Silent fail — don't break user flow for logging
    console.warn("Activity log failed:", e);
  }
}
