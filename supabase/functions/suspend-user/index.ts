/**
 * suspend-user
 * Gère la suspension, réactivation et retrait d'un membre du département.
 *
 * Input : { user_id: string, action: 'suspend' | 'reactivate' | 'remove' }
 * L'appelant doit être le chef du même département que l'utilisateur cible.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identifier l'appelant
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) return json({ error: "Non autorisé" }, 401);

    // Vérifier que l'appelant est chef
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes("chef")) {
      return json({ error: "Accès refusé — seul le chef de département peut effectuer cette action." }, 403);
    }

    // Récupérer le département de l'appelant
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.department_id) {
      return json({ error: "Département introuvable." }, 404);
    }

    const { user_id, action } = await req.json();

    if (!user_id || !action) {
      return json({ error: "user_id et action sont requis." }, 400);
    }

    // Vérifier que la cible appartient au même département
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("department_id, full_name")
      .eq("id", user_id)
      .single();

    if (!targetProfile || targetProfile.department_id !== callerProfile.department_id) {
      return json({ error: "Utilisateur introuvable dans votre département." }, 404);
    }

    // ── Actions ────────────────────────────────────────────

    if (action === "suspend") {
      // ban_duration '876000h' ≈ 100 ans = bannissement indéfini
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });
      await supabaseAdmin
        .from("profiles")
        .update({ is_suspended: true })
        .eq("id", user_id);

      return json({ success: true, action: "suspend" });
    }

    if (action === "reactivate") {
      // ban_duration '0' lève le bannissement
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "0",
      });
      await supabaseAdmin
        .from("profiles")
        .update({ is_suspended: false })
        .eq("id", user_id);

      return json({ success: true, action: "reactivate" });
    }

    if (action === "remove") {
      // Supprimer le rôle → l'utilisateur n'a plus accès
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);

      // Détacher du département (sans supprimer le compte Auth)
      await supabaseAdmin
        .from("profiles")
        .update({ department_id: null, is_suspended: false })
        .eq("id", user_id);

      return json({ success: true, action: "remove" });
    }

    return json({ error: `Action inconnue : ${action}` }, 400);

  } catch (err: any) {
    return json({ error: err.message ?? "Erreur serveur." }, 500);
  }
});
