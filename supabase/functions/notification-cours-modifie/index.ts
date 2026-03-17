/**
 * notification-cours-modifie/index.ts
 * Appelée depuis le frontend après modification d'une séance.
 * Input  : { seance_id, enseignant_id }
 * Output : { email_sent: boolean, whatsapp_link: string | null }
 *
 * - Récupère les infos de la séance modifiée (UE, date, horaire)
 * - Récupère l'email + phone de l'enseignant
 * - Simule l'envoi email (log — à remplacer par Resend/SMTP si disponible)
 * - Génère le lien wa.me
 * - Crée une alerte dans la table alertes
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
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ============================================================
// Handler
// ============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth : vérifier que l'appelant est chef ou assistant ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Lecture body ---
    const { seance_id, enseignant_id } = await req.json();
    if (!seance_id || !enseignant_id) {
      return new Response(JSON.stringify({ error: "seance_id et enseignant_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Infos de la séance ---
    const { data: seance, error: seanceErr } = await supabase
      .from("seances")
      .select(`
        id,
        seance_date,
        start_time,
        end_time,
        type,
        department_id,
        ues ( name )
      `)
      .eq("id", seance_id)
      .single();

    if (seanceErr || !seance) {
      return new Response(JSON.stringify({ error: "Séance introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ueName = (seance.ues as any)?.name ?? "UE inconnue";
    const dateLabel = formatDateFR(seance.seance_date);
    const heureDebut = seance.start_time.substring(0, 5);
    const heureFin   = seance.end_time.substring(0, 5);

    // --- Infos enseignant ---
    const { data: ens, error: ensErr } = await supabase
      .from("enseignants")
      .select("id, first_name, last_name, email, phone")
      .eq("id", enseignant_id)
      .single();

    if (ensErr || !ens) {
      return new Response(JSON.stringify({ error: "Enseignant introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message =
      `Bonjour ${ens.first_name},\n\nVotre séance ${ueName} du ${dateLabel} (${heureDebut}–${heureFin}) a été modifiée.\n\nMerci de vérifier votre emploi du temps.\n\nCordialement.`;

    // --- Lien WhatsApp ---
    const whatsappLink = ens.phone ? buildWhatsAppLink(ens.phone, message) : null;

    // --- Email (simulé — remplacer par Resend/SMTP si dispo) ---
    console.log(`[EMAIL] → ${ens.email}`);
    console.log(`[EMAIL BODY] ${message}`);
    const emailSent = true; // placeholder

    // --- Alerte dans la table alertes ---
    try {
      await supabase.from("alertes").insert({
        department_id: seance.department_id,
        type: "cours_modifie",
        message: `Séance ${ueName} du ${dateLabel} modifiée — notif envoyée à ${ens.first_name} ${ens.last_name}.${whatsappLink ? "\nLien WhatsApp : " + whatsappLink : ""}`,
        reference_id: seance_id,
        reference_type: "seance",
        lue: false,
      });
    } catch (alertErr) {
      console.error("[notification-cours-modifie] alerte:", alertErr);
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: emailSent, whatsapp_link: whatsappLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
