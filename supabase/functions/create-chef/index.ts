/**
 * create-chef/index.ts
 * Edge Function — réservée à l'owner.
 * Le chef est lié au département via profiles.department_id (pas de chef_id sur departments).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    // ── 1. Auth ───────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non autorisé" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) return jsonResponse({ error: "Non autorisé" }, 401);

    // ── 2. Vérifier rôle owner ────────────────────────────
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes("owner")) {
      return jsonResponse({ error: "Accès refusé — seul l'owner peut créer un chef." }, 403);
    }

    // ── 3. Lire le body ───────────────────────────────────
    const { username, full_name, department_id, password } = await req.json();

    if (!username || !full_name || !department_id || !password) {
      return jsonResponse({ error: "Champs manquants : username, full_name, department_id, password." }, 400);
    }
    if (!/^[a-z0-9._-]+$/i.test(username)) {
      return jsonResponse({ error: "Username invalide (lettres, chiffres, . _ - uniquement)." }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "Mot de passe trop court (8 caractères minimum)." }, 400);
    }

    const email = `${username.toLowerCase()}@departo.app`;

    // ── 4. Vérifier que le département existe ─────────────
    const { data: dept, error: deptErr } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .eq("id", department_id)
      .single();

    if (deptErr || !dept) {
      return jsonResponse({ error: "Département introuvable." }, 404);
    }

    // ── 5. Vérifier qu'il n'y a pas déjà un chef ─────────
    // Le chef est identifié par : profile.department_id = department_id ET role = 'chef'
    const { data: deptProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("department_id", department_id);

    const deptProfileIds = (deptProfiles ?? []).map((p: any) => p.id);

    if (deptProfileIds.length > 0) {
      const { data: existingChefs } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "chef")
        .in("user_id", deptProfileIds);

      if ((existingChefs ?? []).length > 0) {
        return jsonResponse({ error: "Ce département a déjà un chef." }, 409);
      }
    }

    // ── 6. Créer le compte Auth ───────────────────────────
    const { data: newUserData, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already")) {
        return jsonResponse(
          { error: `L'identifiant "${username}" est déjà utilisé. Choisissez-en un autre.` },
          409,
        );
      }
      return jsonResponse({ error: createErr.message }, 400);
    }

    const newUserId = newUserData.user.id;

    // ── 7. Attribuer le rôle chef ─────────────────────────
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "chef" });

    if (roleErr) {
      return jsonResponse({ error: `Erreur rôle : ${roleErr.message}` }, 500);
    }

    // ── 8. Rattacher le profil au département ─────────────
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ department_id, full_name, is_first_login: true })
      .eq("id", newUserId);

    if (profileErr) {
      return jsonResponse({ error: `Erreur profil : ${profileErr.message}` }, 500);
    }

    return jsonResponse({
      success: true,
      user_id: newUserId,
      email,
      department_name: dept.name,
    });

  } catch (err: any) {
    return jsonResponse({ error: err.message ?? "Erreur serveur." }, 500);
  }
});
