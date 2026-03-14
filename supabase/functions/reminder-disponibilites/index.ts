import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all departments with semester dates
    const { data: semesterDates } = await supabase
      .from("semester_dates")
      .select("*");

    if (!semesterDates || semesterDates.length === 0) {
      return new Response(JSON.stringify({ message: "No semester dates configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const reminders: string[] = [];

    for (const sem of semesterDates) {
      const startDate = new Date(sem.start_date);
      const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only send reminders at J-7 and J-3
      if (diffDays !== 7 && diffDays !== 3) continue;

      // Get active enseignants for this department
      const { data: enseignants } = await supabase
        .from("enseignants")
        .select("id, email, first_name, last_name, user_id")
        .eq("department_id", sem.department_id)
        .eq("is_active", true);

      if (!enseignants) continue;

      // Get enseignants who have filled disponibilités
      const enseignantIds = enseignants.map((e: any) => e.id);
      const { data: dispos } = await supabase
        .from("enseignant_disponibilites")
        .select("enseignant_id")
        .in("enseignant_id", enseignantIds);

      const filledSet = new Set((dispos || []).map((d: any) => d.enseignant_id));
      const missing = enseignants.filter((e: any) => !filledSet.has(e.id));

      for (const ens of missing) {
        // Use Supabase's built-in email via auth admin (invite-like)
        // For now, log the reminder. In production, integrate with an email service.
        reminders.push(`Rappel J-${diffDays}: ${ens.email} (${ens.first_name} ${ens.last_name})`);

        // If the enseignant has a linked user account, we could send a notification
        // For now we log it. A real implementation would use an email API.
        console.log(`[REMINDER] J-${diffDays} avant ${sem.semestre}: ${ens.email} n'a pas renseigné ses disponibilités`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: reminders.length, details: reminders }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
