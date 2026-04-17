import { supabase } from "@/integrations/supabase/client";

/**
 * Archive a record to the recycle bin before deleting it.
 * Also notifies the CEO about the deletion.
 */
export async function archiveAndDelete(
  table: string,
  recordId: string,
  recordData: Record<string, any>,
  deletedBy: string,
  reason?: string
) {
  // 1. Archive to recycle bin
  await supabase.from("deleted_records" as any).insert({
    original_table: table,
    original_id: recordId,
    deleted_by: deletedBy,
    record_data: recordData,
    reason: reason || null,
  } as any);

  // 2. Delete from original table
  await supabase.from(table as any).delete().eq("id", recordId);

  // 3. Notify CEO
  const { data: ceoRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "ceo");

  if (ceoRoles) {
    for (const ceo of ceoRoles) {
      if (ceo.user_id !== deletedBy) {
        await supabase.from("notifications").insert({
          user_id: ceo.user_id,
          type: "deletion",
          title: `Record deleted from ${table}`,
          message: `${recordData.title || recordData.content?.slice(0, 50) || recordId} was deleted`,
          related_id: recordId,
        });
      }
    }
  }
}

/**
 * Notify CEO about any action across modules
 */
export async function notifyCeo(
  action: string,
  module: string,
  details: string,
  actorId: string,
  relatedId?: string
) {
  const { data: ceoRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "ceo");

  if (ceoRoles) {
    for (const ceo of ceoRoles) {
      if (ceo.user_id !== actorId) {
        await supabase.from("notifications").insert({
          user_id: ceo.user_id,
          type: "activity",
          title: `${module}: ${action}`,
          message: details.slice(0, 200),
          related_id: relatedId || null,
        });
      }
    }
  }
}
