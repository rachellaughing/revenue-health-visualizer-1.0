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

    const members = data ?? [];
    const userIds = members
      .map((m: any) => m.user_id)
      .filter((u: any): u is string => !!u);

    const assessmentsByUser: Record<
      string,
      { status: string; completed_at: string | null; submitted_at: string | null; created_at: string | null }
    > = {};
    if (userIds.length > 0) {
      const { data: aData, error: aErr } = await supabaseAdmin
        .from("assessments")
        .select("user_id,status,completed_at,submitted_at,created_at")
        .in("user_id", userIds);
      if (aErr) throw new Error(aErr.message);
      for (const a of aData ?? []) {
        const uid = a.user_id as string;
        const existing = assessmentsByUser[uid];
        const isCompleted = a.status === "completed";
        if (!existing) {
          assessmentsByUser[uid] = a as any;
        } else if (isCompleted && existing.status !== "completed") {
          assessmentsByUser[uid] = a as any;
        } else if (existing.status !== "completed" && !isCompleted) {
          if ((a.created_at ?? "") > (existing.created_at ?? "")) {
            assessmentsByUser[uid] = a as any;
          }
        }
      }
    }

    return members.map((m: any) => {
      const name: string = m.display_name || m.email || "";
      const initials =
        name
          .split(/[\s@.]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0]?.toUpperCase() ?? "")
          .join("") || "?";

      let status: "Invited" | "Joined" | "In progress" | "Completed" = "Invited";
      let completedAt: string | null = null;
      if (m.user_id) {
        const a = assessmentsByUser[m.user_id as string];
        if (!a) status = "Joined";
        else if (a.status === "completed") {
          status = "Completed";
          completedAt = a.completed_at ?? a.submitted_at ?? null;
        } else status = "In progress";
      }

      return {
        id: m.id as string,
        email: m.email as string,
        display_name: (m.display_name as string | null) ?? null,
        initials,
        status,
        completed_at: completedAt,
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
      status: "pending",
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
