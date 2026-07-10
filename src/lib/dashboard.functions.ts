import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ParentSystem, ChildSystem } from "@/lib/healthcheck.functions";

export type DashboardData = {
  profile: {
    first_name: string | null;
    business_name: string | null;
    profile_complete: boolean;
    company_profile_complete: boolean;
    assessment_status: string;
    assessment_completion_pct: number;
    tier: "starter" | "pro" | "diagnostic";
  } | null;
  latestAssessment: {
    id: string;
    status: string;
    submitted_at: string | null;
    created_at: string | null;
    assessment_version: number;
    selected_child_ids: string[];
  } | null;
  completedCount: number;
  hasScores: boolean;
  overallScore: number | null;
  framework: {
    parents: ParentSystem[];
    children: ChildSystem[];
  };
};

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const userId = context.userId;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "first_name,business_name,profile_complete,company_profile_complete,assessment_status,assessment_completion_pct,tier,role,team_owner_id",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);


    // Team members inherit company context from their team owner — they don't
    // fill out their own company_profiles row, so treat company profile as
    // complete for them to avoid blocking Health Check access.
    const isTeamMember =
      (profile as any)?.role === "member" &&
      (profile as any)?.team_owner_id != null;

    // Team members inherit their owner's tier — their own tier column is
    // never used for access gating.
    let inheritedTier = profile?.tier;
    if (isTeamMember) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("tier")
        .eq("user_id", (profile as any).team_owner_id)
        .maybeSingle();
      if (ownerProfile?.tier) {
        inheritedTier = ownerProfile.tier;
      }
    }

    const effectiveProfile = profile
      ? {
          first_name: profile.first_name,
          business_name: profile.business_name,
          profile_complete: profile.profile_complete,
          company_profile_complete: isTeamMember
            ? true
            : profile.company_profile_complete,
          assessment_status: profile.assessment_status,
          assessment_completion_pct: profile.assessment_completion_pct,
          tier: inheritedTier,
        }
      : null;


    const { data: latest, error: aErr } = await supabaseAdmin
      .from("assessments")
      .select("id,status,submitted_at,created_at,assessment_version")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);

    const { count: completedCount, error: cErr } = await supabaseAdmin
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");
    if (cErr) throw new Error(cErr.message);

    let hasScores = false;
    let overallScore: number | null = null;
    if (latest?.id) {
      const { data: scores, error: sErr } = await supabaseAdmin
        .from("assessment_scores")
        .select("health_score")
        .eq("assessment_id", latest.id);
      if (sErr) throw new Error(sErr.message);
      if (scores && scores.length > 0) {
        hasScores = true;
        const vals = scores
          .map((s) => s.health_score)
          .filter((v): v is number => typeof v === "number");
        if (vals.length > 0) {
          overallScore =
            Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        }
      }
    }

    return {
      profile: effectiveProfile as DashboardData["profile"],
      latestAssessment: latest,
      completedCount: completedCount ?? 0,
      hasScores,
      overallScore,
    };
  });
