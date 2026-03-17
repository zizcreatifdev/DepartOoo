/**
 * get-team-members
 * Retourne la liste enrichie des membres du département (assistants + enseignants)
 * avec les infos auth (email, statut, dernière connexion) inaccessibles côté client.
 *
 * Requiert : appelant authentifié, chef ou assistant du département.
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

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) return json({ error: "Non autorisé" }, 401);

    // Vérifier rôle appelant
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: any) => r.role);
    if (!roles.includes("chef") && !roles.includes("assistant")) {
      return json({ error: "Accès refusé" }, 403);
    }

    // Récupérer le département
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("department_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.department_id) return json({ error: "Département introuvable." }, 404);
    const deptId: string = callerProfile.department_id;

    // ── 1. Profiles + rôles du département (hors chef) ─────
    const { data: members, error: membersError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, is_suspended, user_roles(role)")
      .eq("department_id", deptId)
      .neq("id", caller.id);  // exclure le chef lui-même

    if (membersError) return json({ error: membersError.message }, 500);

    // Ne garder que assistants et enseignants (pas d'autres chefs éventuels)
    const filtered = (members ?? []).filter((m: any) => {
      const memberRoles = (m.user_roles ?? []).map((r: any) => r.role);
      return memberRoles.includes("assistant") || memberRoles.includes("enseignant");
    });

    if (filtered.length === 0) return json({ members: [] });

    // ── 2. Auth users — listUsers (paginé, max 1000) ───────
    const memberIds = new Set(filtered.map((m: any) => m.id));
    const allAuthUsers: any[] = [];

    let page = 1;
    while (true) {
      const { data: { users }, error: listErr } =
        await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr || !users?.length) break;
      allAuthUsers.push(...users.filter(u => memberIds.has(u.id)));
      if (users.length < 1000) break;
      page++;
    }

    const authMap: Record<string, any> = Object.fromEntries(
      allAuthUsers.map(u => [u.id, u]),
    );

    // ── 3. Assembler ───────────────────────────────────────
    const enriched = filtered.map((m: any) => {
      const authUser = authMap[m.id];
      const memberRoles = (m.user_roles ?? []).map((r: any) => r.role);
      const role = memberRoles.includes("assistant") ? "assistant" : "enseignant";

      return {
        id:               m.id,
        full_name:        m.full_name ?? "",
        email:            authUser?.email ?? "",
        role,
        is_suspended:     m.is_suspended ?? false,
        email_confirmed:  !!authUser?.email_confirmed_at,
        last_sign_in_at:  authUser?.last_sign_in_at ?? null,
      };
    });

    return json({ members: enriched });

  } catch (err: any) {
    return json({ error: err.message ?? "Erreur serveur." }, 500);
  }
});
