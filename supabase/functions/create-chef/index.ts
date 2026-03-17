/**
 * create-chef/index.ts
 * Edge Function — réservée à l'owner.
 * Retourne toujours HTTP 200 avec { success } ou { error } dans le body.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Toujours 200 pour que le client lise res.data.error sans exception
function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
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
    if (!authHeader) return ok({ error: "Non autorisé" });

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
    if (!caller) return ok({ error: "Non autorisé — utilisateur non trouvé" });

    // ── 2. Vérifier rôle owner ────────────────────────────
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes("owner")) {
      return ok({ error: "Accès refusé — seul l'owner peut créer un chef." });
    }

    // ── 3. Lire le body ───────────────────────────────────
    const { username, full_name, department_id, password } = await req.json();

    if (!username || !full_name || !department_id || !password) {
      return ok({ error: "Champs manquants : username, full_name, department_id, password." });
    }
    if (!/^[a-z0-9._-]+$/i.test(username)) {
      return ok({ error: "Username invalide (lettres, chiffres, . _ - uniquement)." });
    }
    if (password.length < 8) {
      return ok({ error: "Mot de passe trop court (8 caractères minimum)." });
    }

    const email = `${username.toLowerCase()}@departo.app`;

    // ── 4. Vérifier que le département existe ─────────────
    const { data: dept, error: deptErr } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .eq("id", department_id)
      .single();

    if (deptErr || !dept) {
      return ok({ error: `Département introuvable. (${deptErr?.message ?? "null"})` });
    }

    // ── 5. Vérifier qu'il n'y a pas déjà un chef ─────────
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
        return ok({ error: "Ce département a déjà un chef." });
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
        return ok({ error: `L'identifiant "${username}" est déjà utilisé. Choisissez-en un autre.` });
      }
      return ok({ error: `Erreur création compte : ${createErr.message}` });
    }

    const newUserId = newUserData.user.id;

    // ── 7. Attribuer le rôle chef ─────────────────────────
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "chef" });

    if (roleErr) {
      return ok({ error: `Erreur rôle : ${roleErr.message}` });
    }

    // ── 8. Rattacher le profil au département ─────────────
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ department_id, full_name, is_first_login: true })
      .eq("id", newUserId);

    if (profileErr) {
      return ok({ error: `Erreur profil : ${profileErr.message}` });
    }

    return ok({
      success: true,
      user_id: newUserId,
      email,
      department_name: dept.name,
    });

  } catch (err: any) {
    return ok({ error: `Exception : ${err.message ?? "Erreur serveur."}` });
  }
});
