/**
 * create-chef/index.ts
 * Edge Function — réservée à l'owner.
 * Crée un compte chef de département avec :
 *   - Email au format <username>@departo.app
 *   - Mot de passe défini par l'owner
 *   - is_first_login = true (le chef peut changer son MDP à la 1re connexion)
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
    // ── 1. Auth header ────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non autorisé" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) return jsonResponse({ error: "Non autorisé" }, 401);

    // ── 2. Vérifier que l'appelant est owner ──────────────
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes("owner")) {
      return jsonResponse(
        { error: "Accès refusé — seul l'owner peut créer un chef de département." },
        403,
      );
    }

    // ── 3. Lire le body ───────────────────────────────────
    const { username, full_name, department_id, password } = await req.json();

    if (!username || !full_name || !department_id || !password) {
      return jsonResponse(
        { error: "Champs manquants : username, full_name, department_id, password requis." },
        400,
      );
    }

    // Validation username : lettres, chiffres, tirets, points seulement
    if (!/^[a-z0-9._-]+$/i.test(username)) {
      return jsonResponse(
        { error: "Username invalide (lettres, chiffres, . _ - uniquement)." },
        400,
      );
    }

    if (password.length < 8) {
      return jsonResponse({ error: "Le mot de passe doit faire au moins 8 caractères." }, 400);
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
    const { data: existingChef } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, profiles!inner(department_id)")
      .eq("role", "chef");

    const alreadyHasChef = (existingChef ?? []).some(
      (r: any) => r.profiles?.department_id === department_id,
    );

    if (alreadyHasChef) {
      return jsonResponse(
        { error: "Ce département a déjà un chef. Supprimez l'existant avant d'en créer un nouveau." },
        409,
      );
    }

    // ── 6. Créer l'utilisateur Auth ───────────────────────
    const { data: newUserData, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,   // pas besoin de vérification email
        user_metadata: { full_name },
      });

    if (createErr) {
      // Erreur "email already exists"
      if (createErr.message?.toLowerCase().includes("already")) {
        return jsonResponse(
          { error: `L'identifiant "${username}" est déjà utilisé. Choisissez-en un autre.` },
          409,
        );
      }
      return jsonResponse({ error: createErr.message }, 400);
    }

    const newUserId = newUserData.user.id;

    // ── 7. Rôle chef ──────────────────────────────────────
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "chef",
    });

    // ── 8. Profil : rattacher département + nom + first_login ──
    await supabaseAdmin
      .from("profiles")
      .update({
        department_id,
        full_name,
        is_first_login: true,
      })
      .eq("id", newUserId);

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
