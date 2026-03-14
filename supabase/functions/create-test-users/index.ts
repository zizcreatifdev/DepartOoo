import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results = [];
  const sharedPassword = "Departo2024!";

  const users = [
    { email: "chef@departo.test", fullName: "Dr. Amadou Diallo", role: "chef" },
    { email: "assistant@departo.test", fullName: "Fatou Sow", role: "assistant" },
    { email: "enseignant@departo.test", fullName: "Moussa Kone", role: "enseignant" },
    { email: "owner@departo.test", fullName: "Admin Departo", role: "owner" },
  ];

  // 1. Delete existing test users
  for (const u of users) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
    if (existing) {
      await supabase.from("user_roles").delete().eq("user_id", existing.id);
      await supabase.from("profiles").delete().eq("id", existing.id);
      await supabase.auth.admin.deleteUser(existing.id);
      results.push({ email: u.email, step: "deleted_old" });
    }
  }

  // 2. Delete orphan departments named "Informatique" from previous runs
  await supabase.from("departments").delete().eq("name", "Informatique");

  // 3. Create department
  const { data: dept, error: deptErr } = await supabase
    .from("departments")
    .insert({ name: "Informatique", university: "Universite Cheikh Anta Diop", onboarding_completed: true })
    .select()
    .single();

  if (deptErr) {
    return new Response(JSON.stringify({ error: deptErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const deptId = dept.id;

  // 4. Create users
  for (const u of users) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: sharedPassword,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });

    if (authErr) {
      results.push({ email: u.email, error: authErr.message });
      continue;
    }

    const userId = authData.user.id;

    // Link profile to department (owner has no department)
    if (u.role !== "owner") {
      await supabase.from("profiles").update({ department_id: deptId, full_name: u.fullName }).eq("id", userId);
    } else {
      await supabase.from("profiles").update({ full_name: u.fullName }).eq("id", userId);
    }

    // Assign role
    await supabase.from("user_roles").insert({ user_id: userId, role: u.role });

    results.push({ email: u.email, role: u.role, password: sharedPassword, success: true });
  }

  return new Response(JSON.stringify({ department_id: deptId, password: sharedPassword, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
