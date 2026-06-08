import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getOrCreateTeamId(userId: string): Promise<string> {
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (existing?.id) return existing.id as string;
  const { data: created, error: insErr } = await supabaseAdmin
    .from("teams")
    .insert({ owner_id: userId, team_name: "My Team" })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return created!.id as string;
}

async function assertPaidTier(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const tier = (data?.tier as string | undefined) ?? "starter";
  if (tier !== "pro" && tier !== "diagnostic") {
    throw new Error("Team features require Revenue Health Assessment™ or higher.");
  }
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const teamId = await getOrCreateTeamId(context.userId);
    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select("id,email,display_name,status,user_id,created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((m: any) => {
      const name: string = m.display_name || m.email || "";
      const initials = name
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0]?.toUpperCase() ?? "")
        .join("") || "?";
      const status = m.status === "active" || m.user_id ? "Active" : "Invited";
      return {
        id: m.id as string,
        email: m.email as string,
        display_name: (m.display_name as string | null) ?? null,
        initials,
        status,
      };
    });
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPaidTier(context.userId);
    const teamId = await getOrCreateTeamId(context.userId);

    const { data: existing, error: existErr } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", data.email)
      .maybeSingle();
    if (existErr) throw new Error(existErr.message);
    if (existing) throw new Error("This person has already been invited");

    const token =
      globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const { error: insErr } = await supabaseAdmin.from("team_members").insert({
      team_id: teamId,
      email: data.email,
      invite_token: token,
      status: "invited",
    });
    if (insErr) throw new Error(insErr.message);

    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
    );
    if (inviteErr) {
      // Roll back the row so the user can retry
      await supabaseAdmin
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("email", data.email);
      throw new Error(inviteErr.message);
    }

    return { ok: true, email: data.email };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const teamId = await getOrCreateTeamId(context.userId);
    const { error } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("id", data.id)
      .eq("team_id", teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
