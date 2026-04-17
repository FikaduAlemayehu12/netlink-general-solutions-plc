import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is CEO
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: callerRoles } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isCeo = callerRoles?.some((r: any) => r.role === "ceo");
    if (!isCeo) throw new Error("Only CEO can create staff accounts");

    const { full_name, email, position, roles } = await req.json();
    if (!full_name || !email) throw new Error("Name and email required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create auth user with default password
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: "netlink123",
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) throw createError;

    const userId = newUser.user!.id;

    // Update profile with position
    await adminClient.from("profiles").update({ position, full_name }).eq("user_id", userId);

    // Set must_change_password
    await adminClient.from("profiles").update({ must_change_password: true }).eq("user_id", userId);

    // Assign roles
    const rolesToInsert = (roles || ["staff"]).map((role: string) => ({ user_id: userId, role }));
    await adminClient.from("user_roles").insert(rolesToInsert);

    return new Response(JSON.stringify({ user_id: userId, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
