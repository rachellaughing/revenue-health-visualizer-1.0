import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ViewerContext = {
  role: "owner" | "team_member";
  userId: string;
  firstName: string | null;
  teamMember?: {
    ownerUserId: string;
    ownerFirstName: string | null;
    ownerEmail: string | null;
    companyName: string | null;
    teamId: string;
    parentAssessmentId: string | null;
    parentSelectedChildIds: string[];
    ownAssessmentId: string | null;
    ownStatus: string | null;
    ownCompletionPct: number;
    submittedAt: string | null;
  };
};

export const getViewerContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ViewerContext> => {
    const userId = context.userId;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("role, first_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    const role = (profile?.role ?? "owner") === "team_member"
      ? "team_member"
      : "owner";

    const base = {
      userId,
      firstName: profile?.first_name ?? null,
    };

    if (role === "owner") {
      return { role: "owner", ...base };
    }

    // Team member: look up their team & founder
    const { data: tm, error: tmErr } = await supabaseAdmin
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (tmErr) throw new Error(tmErr.message);

    if (!tm) {
      // role says team_member but no team_members row — treat as owner to
      // avoid lockout (shouldn't happen in normal flow)
      return { role: "owner", ...base };
    }

    const { data: team, error: tErr } = await supabaseAdmin
      .from("teams")
      .select("owner_id")
      .eq("id", tm.team_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);

    const ownerUserId = team?.owner_id ?? null;

    let ownerFirstName: string | null = null;
    let ownerEmail: string | null = null;
    let companyName: string | null = null;
    let parentAssessmentId: string | null = null;
    let parentSelectedChildIds: string[] = [];

    if (ownerUserId) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("first_name, email")
        .eq("user_id", ownerUserId)
        .maybeSingle();
      ownerFirstName = ownerProfile?.first_name ?? null;
      ownerEmail = ownerProfile?.email ?? null;

      const { data: ownerCompany } = await supabaseAdmin
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", ownerUserId)
        .maybeSingle();
      companyName = ownerCompany?.company_name ?? null;

      // Owner's reference assessment: most recent completed, else most recent
      const { data: completedAsmt } = await supabaseAdmin
        .from("assessments")
        .select("id, selected_child_ids")
        .eq("user_id", ownerUserId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let refAsmt = completedAsmt;
      if (!refAsmt) {
        const { data: latestAsmt } = await supabaseAdmin
          .from("assessments")
          .select("id, selected_child_ids")
          .eq("user_id", ownerUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        refAsmt = latestAsmt ?? null;
      }
      if (refAsmt) {
        parentAssessmentId = refAsmt.id;
        parentSelectedChildIds =
          (refAsmt.selected_child_ids as string[] | null) ?? [];
      }
    }

    // Own assessment (linked to parent)
    const { data: ownAsmt } = await supabaseAdmin
      .from("assessments")
      .select("id, status, completion_pct, submitted_at")
      .eq("user_id", userId)
      .not("parent_assessment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      role: "team_member",
      ...base,
      teamMember: {
        ownerUserId: ownerUserId ?? "",
        ownerFirstName,
        ownerEmail,
        companyName,
        teamId: tm.team_id,
        parentAssessmentId,
        parentSelectedChildIds,
        ownAssessmentId: ownAsmt?.id ?? null,
        ownStatus: ownAsmt?.status ?? null,
        ownCompletionPct: ownAsmt?.completion_pct ?? 0,
        submittedAt: ownAsmt?.submitted_at ?? null,
      },
    };
  });
