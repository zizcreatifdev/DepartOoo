/**
 * reminder-disponibilites/index.ts
 * Cron : à appeler à J-7 ET J-3 avant semester_dates.start_date.
 * Pour chaque enseignant n'ayant pas renseigné ses disponibilités :
 *   - Génère un lien wa.me si `phone` est renseigné
 *   - Insère une alerte dans la table alertes pour l'assistant du département
 *   - Retourne la liste des liens WhatsApp générés
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Helper : génère un lien wa.me cliquable
// ============================================================
function buildWhatsAppLink(phone: string, message: string): string {
  // Nettoyage : garder uniquement chiffres et '+'
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

// ============================================================
// Handler principal
// ============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Récupérer tous les semestres configurés ---
    const { data: semesterDates } = await supabase
      .from("semester_dates")
      .select("*");

    if (!semesterDates || semesterDates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No semester dates configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();
    const results: {
      enseignant: string;
      jours_restants: number;
      whatsapp_link: string | null;
      alerte_inseree: boolean;
    }[] = [];

    for (const sem of semesterDates) {
      const startDate = new Date(sem.start_date);
      const diffDays = Math.ceil(
        (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Envoyer uniquement à J-7 et J-3
      if (diffDays !== 7 && diffDays !== 3) continue;

      // --- Enseignants actifs du département ---
      const { data: enseignants } = await supabase
        .from("enseignants")
        .select("id, email, first_name, last_name, phone, user_id")
        .eq("department_id", sem.department_id)
        .eq("is_active", true);

      if (!enseignants || enseignants.length === 0) continue;

      // --- Filtrer ceux qui n'ont PAS de disponibilités ---
      const enseignantIds = enseignants.map((e: any) => e.id);
      const { data: dispos } = await supabase
        .from("enseignant_disponibilites")
        .select("enseignant_id")
        .in("enseignant_id", enseignantIds);

      const filledSet = new Set((dispos || []).map((d: any) => d.enseignant_id));
      const missing = enseignants.filter((e: any) => !filledSet.has(e.id));

      for (const ens of missing) {
        const fullName = `${ens.first_name} ${ens.last_name}`;
        const message =
          `Bonjour ${ens.first_name},\n\nMerci de renseigner vos disponibilités pour le semestre ${sem.semestre} avant le ${startDate.toLocaleDateString("fr-FR")}.\n\nCordialement,\nVotre département.`;

        // --- Lien WhatsApp ---
        let whatsappLink: string | null = null;
        if (ens.phone) {
          whatsappLink = buildWhatsAppLink(ens.phone, message);
        }

        // --- Alerte pour l'assistant ---
        let alerteInseree = false;
        try {
          // Vérifier doublon (même enseignant, même type, même semestre)
          const { data: existing } = await supabase
            .from("alertes")
            .select("id")
            .eq("department_id", sem.department_id)
            .eq("type", "disponibilite_manquante")
            .eq("reference_id", ens.id)
            .maybeSingle();

          if (!existing) {
            await supabase.from("alertes").insert({
              department_id: sem.department_id,
              type: "disponibilite_manquante",
              message: `${fullName} n'a pas renseigné ses disponibilités (J-${diffDays} avant le semestre ${sem.semestre}).${whatsappLink ? "\nLien WhatsApp : " + whatsappLink : ""}`,
              reference_id: ens.id,
              reference_type: "enseignant",
              lue: false,
            });
            alerteInseree = true;
          }
        } catch (alertErr) {
          console.error("[reminder-disponibilites] alerte:", alertErr);
        }

        console.log(
          `[REMINDER] J-${diffDays} — ${fullName} <${ens.email}> — WA: ${whatsappLink ?? "N/A"}`,
        );

        results.push({
          enseignant: fullName,
          jours_restants: diffDays,
          whatsapp_link: whatsappLink,
          alerte_inseree: alerteInseree,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
