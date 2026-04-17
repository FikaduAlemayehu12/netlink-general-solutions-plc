import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is staff
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isHrOrCeo = callerRoles?.some(r => ["ceo", "hr"].includes(r.role));
    if (!isHrOrCeo) throw new Error("Only HR and CEO can generate experience letters");

    const { staffId, periodStart, periodEnd, letterType } = await req.json();
    if (!staffId) throw new Error("staffId is required");

    const endDate = periodEnd || new Date().toISOString().split("T")[0];
    
    // Fetch all relevant data for the staff member
    const [
      profileRes, empProfileRes, qualRes, rolesRes,
      projectsRes, tasksRes, ticketsRes, plansRes,
      attendanceRes, perfRes, scoresRes
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", staffId).single(),
      supabase.from("employee_profiles").select("*").eq("user_id", staffId).single(),
      supabase.from("employee_qualifications").select("*").eq("user_id", staffId),
      supabase.from("user_roles").select("role").eq("user_id", staffId),
      supabase.from("project_groups").select("*").contains("member_ids", [staffId]),
      supabase.from("project_tasks").select("*").eq("assigned_to", staffId),
      supabase.from("support_tickets").select("*").or(`created_by.eq.${staffId},assigned_to.eq.${staffId}`),
      supabase.from("plans").select("*").eq("author_id", staffId),
      supabase.from("attendance").select("*").eq("user_id", staffId),
      supabase.from("performance_records").select("*").eq("staff_id", staffId),
      supabase.from("performance_scores").select("*").eq("staff_id", staffId),
    ]);

    const profile = profileRes.data;
    const empProfile = empProfileRes.data;
    const qualifications = qualRes.data || [];
    const roles = rolesRes.data || [];
    const projects = projectsRes.data || [];
    const tasks = tasksRes.data || [];
    const tickets = ticketsRes.data || [];
    const plans = plansRes.data || [];
    const attendance = attendanceRes.data || [];
    const perfRecords = perfRes.data || [];
    const perfScores = scoresRes.data || [];

    // Calculate statistics
    const totalWorkHours = attendance.reduce((sum: number, a: any) => sum + (Number(a.work_hours) || 0), 0);
    const completedTasks = tasks.filter((t: any) => t.status === "done").length;
    const resolvedTickets = tickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length;
    const completedPlans = plans.filter((p: any) => p.status === "completed").length;
    const avgGrade = perfRecords.length > 0
      ? perfRecords.reduce((sum: number, r: any) => sum + Number(r.grade), 0) / perfRecords.length
      : 0;
    const totalPoints = perfScores.reduce((sum: number, s: any) => sum + (s.points || 0), 0);

    const generatedData = {
      staffName: profile?.full_name || "Unknown",
      email: profile?.email,
      position: profile?.position || empProfile?.hiring_position || "Staff",
      department: empProfile?.department,
      hiringDate: empProfile?.hiring_date,
      periodStart: periodStart || empProfile?.hiring_date,
      periodEnd: endDate,
      qualifications: qualifications.map((q: any) => ({
        type: q.qualification_type,
        title: q.title,
        institution: q.institution,
        field: q.field_of_study,
        date: q.date_obtained,
      })),
      roles: roles.map((r: any) => r.role),
      statistics: {
        projectsParticipated: projects.length,
        tasksCompleted: completedTasks,
        totalTasks: tasks.length,
        ticketsHandled: tickets.length,
        ticketsResolved: resolvedTickets,
        plansSubmitted: plans.length,
        plansCompleted: completedPlans,
        totalWorkHours: Math.round(totalWorkHours),
        attendanceDays: attendance.length,
        averagePerformanceGrade: Math.round(avgGrade * 100) / 100,
        totalPerformancePoints: totalPoints,
      },
    };

    // Generate AI-powered experience summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiContent = "";

    if (LOVABLE_API_KEY) {
      const systemPrompt = `You are an HR professional writing official employee experience letters for Netting General Solutions, an Ethiopian IT company. Write formal, professional experience letters suitable for official use. Include specific metrics and achievements based on the provided data. The letter should be in formal business letter format.`;

      const userPrompt = `Generate a professional ${letterType || "experience"} letter for the following employee:

Name: ${generatedData.staffName}
Position: ${generatedData.position}
Department: ${generatedData.department || "N/A"}
Employment Period: ${generatedData.periodStart || "N/A"} to ${generatedData.periodEnd}

Qualifications:
${qualifications.map((q: any) => `- ${q.qualification_type}: ${q.title} from ${q.institution || "N/A"}`).join("\n") || "None recorded"}

Performance Summary:
- Projects participated: ${generatedData.statistics.projectsParticipated}
- Tasks completed: ${generatedData.statistics.tasksCompleted} out of ${generatedData.statistics.totalTasks}
- Tickets handled: ${generatedData.statistics.ticketsHandled} (${generatedData.statistics.ticketsResolved} resolved)
- Plans submitted: ${generatedData.statistics.plansSubmitted} (${generatedData.statistics.plansCompleted} completed)
- Total work hours: ${generatedData.statistics.totalWorkHours}
- Attendance days: ${generatedData.statistics.attendanceDays}
- Average performance grade: ${generatedData.statistics.averagePerformanceGrade}
- Total performance points: ${generatedData.statistics.totalPerformancePoints}

Write a comprehensive, formal experience letter that highlights the employee's contributions and performance. Include specific numbers and achievements. The letter should be from "Netting General Solutions" management.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiContent = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI generation failed:", e);
      }
    }

    // If AI failed, generate a template
    if (!aiContent) {
      aiContent = `EXPERIENCE LETTER

To Whom It May Concern,

This is to certify that ${generatedData.staffName} has been employed at Netting General Solutions as ${generatedData.position}${generatedData.department ? ` in the ${generatedData.department} department` : ""}.

Period of Employment: ${generatedData.periodStart || "N/A"} to ${generatedData.periodEnd}

During their tenure, ${generatedData.staffName} has demonstrated the following achievements:
- Participated in ${generatedData.statistics.projectsParticipated} project(s)
- Completed ${generatedData.statistics.tasksCompleted} task(s)
- Handled ${generatedData.statistics.ticketsHandled} support ticket(s)
- Logged ${generatedData.statistics.totalWorkHours} total work hours
- Achieved an average performance grade of ${generatedData.statistics.averagePerformanceGrade}

We wish them continued success in their future endeavors.

Sincerely,
Netting General Solutions Management`;
    }

    // Save the letter
    const { data: letter, error: insertError } = await supabase
      .from("experience_letters")
      .insert({
        user_id: staffId,
        requested_by: user.id,
        letter_type: letterType || "experience",
        status: "pending_hr",
        content: aiContent,
        generated_data: generatedData,
        period_start: generatedData.periodStart,
        period_end: endDate,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ letter, generatedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-experience error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
