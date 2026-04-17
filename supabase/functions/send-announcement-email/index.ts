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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check that user is staff
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Not authorized - staff only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, content, recipients } = await req.json();

    if (!title || !content || !recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Title, content, and recipients are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI Gateway to generate a well-formatted email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0a1628, #132644); padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Netlink General Solutions</h2>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h3 style="color: #0a1628; margin-top: 0;">${title}</h3>
          <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${content}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This email was sent by Netlink General Solutions.<br/>
            If you have questions, reply to this email or contact us at info@netlink-gs.com
          </p>
        </div>
      </body>
      </html>
    `;

    // For now, we'll log the email and create a notification for the applicant
    // In production, you'd integrate with an email service
    console.log(`Sending email to ${recipients.join(", ")}: ${title}`);

    // If any recipient has an account, send them an in-app notification
    for (const recipientEmail of recipients) {
      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", recipientEmail)
        .single();

      if (profile) {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          type: "email",
          title: title,
          message: content.substring(0, 500),
        });
      }

      // Also check auth users for applicants who signed in via Google
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const matchedUser = users?.find(u => u.email === recipientEmail);
      if (matchedUser && (!profile || profile.user_id !== matchedUser.id)) {
        await supabase.from("notifications").insert({
          user_id: matchedUser.id,
          type: "email",
          title: title,
          message: content.substring(0, 500),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
