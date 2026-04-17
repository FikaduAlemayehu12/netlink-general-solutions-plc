import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { applicant_name, applicant_email, position, cover_message, cv_url, vacancy_id } = await req.json();

    if (!applicant_name || !applicant_email) {
      return new Response(JSON.stringify({ error: "Name and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Insert the application
    const { data: app, error: insertError } = await supabase
      .from("job_applications")
      .insert({
        applicant_name,
        applicant_email,
        position,
        cover_message,
        cv_url,
        vacancy_id,
        user_id: userId,
        status: "new",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-subscribe the applicant
    await supabase.from("subscriber_emails").upsert(
      { email: applicant_email, user_id: userId, subscribed: true },
      { onConflict: "email" }
    );

    // Notify HR/CEO about new application
    const { data: executives } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["ceo", "hr"]);

    if (executives) {
      for (const exec of executives) {
        await supabase.from("notifications").insert({
          user_id: exec.user_id,
          type: "application",
          title: "New Job Application",
          message: `${applicant_name} applied for ${position || "a position"}`,
          related_id: app.id,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, id: app.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
