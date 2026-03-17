import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Limites enseignants par offre ───────────────────────────
const LIMITES_ENSEIGNANTS: Record<string, number> = {
  starter:    30,
  pro:        60,
  universite: Infinity,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Non autorisé" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Vérifier l'identité de l'appelant
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Non autorisé" }, 401);
    }

    // Vérifier que l'appelant est chef ou assistant
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles ?? []).map((r: any) => r.role);
    if (!userRoles.includes("chef") && !userRoles.includes("assistant")) {
      return jsonResponse({ error: "Accès refusé" }, 403);
    }

    const { email, full_name, enseignant_id, department_id } = await req.json();

    if (!email || !full_name || !department_id) {
      return jsonResponse(
        { error: "Champs manquants : email, full_name, department_id requis." },
        400,
      );
    }

    // ── Vérifier la limite enseignants selon l'offre ───────
    const { data: deptData, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("offre")
      .eq("id", department_id)
      .single();

    if (deptError || !deptData) {
      return jsonResponse({ error: "Département introuvable." }, 404);
    }

    const offre: string = (deptData as any).offre ?? "starter";
    const maxEnseignants = LIMITES_ENSEIGNANTS[offre] ?? 30;

    if (maxEnseignants !== Infinity) {
      const { data: counts } = await supabaseAdmin
        .from("department_member_counts")
        .select("nb_enseignants")
        .eq("department_id", department_id)
        .maybeSingle();

      const currentCount = Number((counts as any)?.nb_enseignants ?? 0);

      if (currentCount >= maxEnseignants) {
        const message =
          offre === "starter"
            ? `Limite de ${maxEnseignants} enseignants atteinte (offre Starter). Passez à Pro pour en ajouter davantage.`
            : `Limite de ${maxEnseignants} enseignants atteinte (offre Pro). Contactez-nous pour augmenter la limite.`;

        return jsonResponse({ error: "LIMITE_ATTEINTE", message }, 403);
      }
    }

    // ── Envoyer l'invitation par email ─────────────────────
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name },
        redirectTo: `${siteUrl}/reset-password`,
      });

    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400);
    }

    const newUserId = inviteData.user.id;

    // Attribuer le rôle enseignant
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "enseignant",
    });

    // Rattacher au département + nom complet
    await supabaseAdmin
      .from("profiles")
      .update({ department_id, full_name })
      .eq("id", newUserId);

    // Lier l'enregistrement enseignant si fourni
    if (enseignant_id) {
      await supabaseAdmin
        .from("enseignants")
        .update({ user_id: newUserId })
        .eq("id", enseignant_id);
    }

    return jsonResponse({ success: true, user_id: newUserId });
  } catch (err: any) {
    return jsonResponse({ error: err.message ?? "Erreur serveur." }, 500);
  }
});
