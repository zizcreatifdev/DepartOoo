import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Limites par offre ───────────────────────────────────────
const LIMITES_ASSISTANTS: Record<string, number> = {
  starter:    1,
  pro:        2,
  universite: Infinity,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Vérifier l'Authorization header ─────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Non autorisé" }, 401);
    }

    // Client admin (service_role) — opérations privilégiées
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Client utilisateur — identifier l'appelant
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return jsonResponse({ error: "Non autorisé" }, 401);
    }

    // ── 2. Vérifier que l'appelant est 'chef' ──────────────
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes("chef")) {
      return jsonResponse(
        { error: "Accès refusé — seul le chef de département peut inviter un assistant." },
        403,
      );
    }

    // ── 3. Lire le body ────────────────────────────────────
    const { email, full_name, department_id } = await req.json();

    if (!email || !full_name || !department_id) {
      return jsonResponse(
        { error: "Champs manquants : email, full_name, department_id requis." },
        400,
      );
    }

    // ── 4. Vérifier la limite assistants selon l'offre ─────
    const { data: deptData, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("offre")
      .eq("id", department_id)
      .single();

    if (deptError || !deptData) {
      return jsonResponse({ error: "Département introuvable." }, 404);
    }

    const offre: string = deptData.offre ?? "starter";
    const maxAssistants = LIMITES_ASSISTANTS[offre] ?? 1;

    if (maxAssistants !== Infinity) {
      const { data: counts } = await supabaseAdmin
        .from("department_member_counts")
        .select("nb_assistants")
        .eq("department_id", department_id)
        .maybeSingle();

      const currentCount = Number(counts?.nb_assistants ?? 0);

      if (currentCount >= maxAssistants) {
        const message =
          offre === "starter"
            ? `Votre offre Starter ne permet qu'un seul assistant. Passez à Pro pour en ajouter un deuxième.`
            : `Votre offre Pro permet ${maxAssistants} assistants. Contactez-nous pour augmenter la limite.`;

        return jsonResponse(
          { error: "LIMITE_ATTEINTE", message },
          403,
        );
      }
    }

    // ── 5. Envoyer l'invitation par email ──────────────────
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

    // ── 6. Attribuer le rôle assistant ─────────────────────
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "assistant",
    });

    // ── 7. Rattacher au département + nom complet ──────────
    await supabaseAdmin
      .from("profiles")
      .update({ department_id, full_name })
      .eq("id", newUserId);

    return jsonResponse({ success: true, user_id: newUserId });
  } catch (err: any) {
    return jsonResponse({ error: err.message ?? "Erreur serveur." }, 500);
  }
});
