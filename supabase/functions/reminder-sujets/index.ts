/**
 * reminder-sujets/index.ts
 * Cron : à appeler à J-7 et J-3 avant la deadline des sujets.
 * Cherche les sujets manquants (file_path IS NULL) dont la deadline
 * est dans les 7 prochains jours et notifie les enseignants concernés.
 *
 * Pour chaque sujet manquant :
 *   - Génère un lien wa.me si `phone` est renseigné
 *   - Insère une alerte de type 'sujet_retard' (dédupliquée)
 *   - Simule l'envoi email
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Helper wa.me
// ============================================================
function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

// ============================================================
// Helper date FR
// ============================================================
function formatDateFR(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function joursRestants(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ============================================================
// Handler
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

    // --- Sujets manquants avec deadline dans les 7 prochains jours ---
    const { data: sujets, error: sujetsErr } = await supabase
      .from("examen_sujets")
      .select(`
        id,
        deadline,
        examen_id,
        enseignant_id,
        examens (
          id,
          exam_date,
          department_id,
          ues ( name )
        ),
        enseignants (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .is("file_path", null)
      .not("deadline", "is", null)
      .gte("deadline", new Date().toISOString())
      .lte("deadline", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (sujetsErr) throw new Error(sujetsErr.message);

    const results: {
      sujet_id: string;
      enseignant: string;
      ue: string;
      jours_restants: number;
      whatsapp_link: string | null;
      alerte_inseree: boolean;
    }[] = [];

    for (const sujet of (sujets ?? []) as any[]) {
      const ens = sujet.enseignants;
      const examen = sujet.examens;
      if (!ens || !examen) continue;

      const ueName  = examen.ues?.name ?? "UE inconnue";
      const deptId  = examen.department_id;
      const deadlineLabel = formatDateFR(sujet.deadline);
      const jours = joursRestants(sujet.deadline);

      const message =
        `Bonjour ${ens.first_name},\n\nLe sujet d'examen pour l'UE "${ueName}" est attendu avant le ${deadlineLabel} (J-${jours}).\n\nMerci de le déposer dès que possible.\n\nCordialement.`;

      // --- WhatsApp ---
      const whatsappLink = ens.phone ? buildWhatsAppLink(ens.phone, message) : null;

      // --- Email simulé ---
      console.log(`[EMAIL] → ${ens.email} | ${ueName} | deadline ${deadlineLabel}`);

      // --- Alerte (dédupliquée par sujet_id + type) ---
      let alerteInseree = false;
      try {
        const { data: existing } = await supabase
          .from("alertes")
          .select("id")
          .eq("department_id", deptId)
          .eq("type", "sujet_retard")
          .eq("reference_id", sujet.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("alertes").insert({
            department_id: deptId,
            type: "sujet_retard",
            message: `Sujet manquant — ${ueName} — deadline ${deadlineLabel} (J-${jours}) — ${ens.first_name} ${ens.last_name}.${whatsappLink ? "\nLien WhatsApp : " + whatsappLink : ""}`,
            reference_id: sujet.id,
            reference_type: "examen_sujet",
            lue: false,
          });
          alerteInseree = true;
        }
      } catch (alertErr) {
        console.error("[reminder-sujets] alerte:", alertErr);
      }

      results.push({
        sujet_id: sujet.id,
        enseignant: `${ens.first_name} ${ens.last_name}`,
        ue: ueName,
        jours_restants: jours,
        whatsapp_link: whatsappLink,
        alerte_inseree: alerteInseree,
      });
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
