import { supabase } from "@/integrations/supabase/client";

/**
 * Logs a client action so it appears in the staff activity log.
 * Falls back silently for unauthenticated users.
 */
export async function logClientActivity(
  action: "view" | "like" | "comment" | "react" | "unlike",
  contentId: string,
  contentType: string,
  details: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      module: "client_engagement",
      record_id: contentId,
      record_type: contentType,
      details,
    });
  } catch {
    // Best-effort; do not surface errors to user
  }
}
