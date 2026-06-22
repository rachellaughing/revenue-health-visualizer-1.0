import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ParentSystem = {
  id: string;
  code: string;
  name: string;
  color_hex: string;
  sort_order: number;
};

export type ChildSystem = {
  id: string;
  parent_system_id: string;
  code: string;
  name: string;
  access_tier: string; // 'free' | 'paid'
  sort_order: number;
};

export type Area = {
  id: string; // evaluation_area_id
  child_system_id: string;
  code: string; // area_code
  name: string;
  sort_order: number;
  question_id: string; // questions.id (uuid)
  question_text: string;
  helper_text: string | null;
};

export type ResponseRow = {
  question_id: string;
  health_response: number | null;
  tracking_response: number | null;
};

export type AssessmentScoreRow = {
  child_system_id: string;
  health_score: number;
  tracking_score: number;
};

export type HealthCheckData = {
  tier: "starter" | "pro" | "diagnostic";
  assessment: {
    id: string;
    status: string;
    completion_pct: number;
    selected_child_ids: string[];
    submitted_at: string | null;
    completed_at: string | null;
  };
  parents: ParentSystem[];
  children: ChildSystem[];
  areas: Area[];
  responses: ResponseRow[];
  scores: AssessmentScoreRow[];
  totalUnlockedAreas: number;
  isTeamMember: boolean;
  teamContext?: {
    companyName: string | null;
    ownerFirstName: string | null;
    ownerEmail: string | null;
  };
};



async function loadFrameworkAndResponses(assessmentId: string) {
  const [parentsRes, childrenRes, areasRes, questionsRes, respRes] =
    await Promise.all([
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("parent_systems")
        .select("id,code,name,color_hex,sort_order")
        .order("sort_order"),
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("child_systems")
        .select("id,parent_system_id,code,name,access_tier,sort_order")
        .order("sort_order"),
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("evaluation_areas")
        .select("id,child_system_id,name,area_code,sort_order")
        .order("sort_order"),
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("questions")
        .select("id,evaluation_area_id,default_question,helper_text,sort_order,status")
        .order("sort_order"),
      supabaseAdmin
        .from("assessment_responses")
        .select("question_id,health_response,tracking_response")
        .eq("assessment_id", assessmentId),
    ]);

  for (const r of [parentsRes, childrenRes, areasRes, questionsRes, respRes]) {
    if ((r as any).error) throw new Error((r as any).error.message);
  }

  // pick one question per evaluation_area: first active one by sort_order
  const qByArea = new Map<string, any>();
  for (const q of questionsRes.data ?? []) {
    if (q.status && q.status !== "active") continue;
    if (!qByArea.has(q.evaluation_area_id)) qByArea.set(q.evaluation_area_id, q);
  }

  const areas: Area[] = (areasRes.data ?? [])
    .map((a: any) => {
      const q = qByArea.get(a.id);
      if (!q) return null;
      return {
        id: a.id,
        child_system_id: a.child_system_id,
        code: a.area_code,
        name: a.name,
        sort_order: a.sort_order,
        question_id: q.id,
        question_text: q.default_question,
        helper_text: q.helper_text,
      } as Area;
    })
    .filter(Boolean) as Area[];

  return {
    parents: (parentsRes.data ?? []) as ParentSystem[],
    children: (childrenRes.data ?? []) as ChildSystem[],
    areas,
    responses: (respRes.data ?? []) as ResponseRow[],
  };
}

function countUnlockedAreas(
  tier: string,
  children: ChildSystem[],
  areas: Area[],
): number {
  const unlockedChildIds = new Set(
    children.filter((c) => c.access_tier === "free" || tier !== "starter").map(
      (c) => c.id,
    ),
  );
  return areas.filter((a) => unlockedChildIds.has(a.child_system_id)).length;
}

function computeCompletionPct(
  tier: string,
  children: ChildSystem[],
  areas: Area[],
  responses: ResponseRow[],
  selectedChildUuids: string[] = [],
): { pct: number; total: number; done: number } {
  let relevantChildIds: Set<string>;
  if (tier === "starter") {
    // Starter: only count questions for the user's selected child systems
    relevantChildIds = new Set(selectedChildUuids);
  } else {
    relevantChildIds = new Set(children.map((c) => c.id));
  }
  const relevantQids = new Set(
    areas.filter((a) => relevantChildIds.has(a.child_system_id)).map(
      (a) => a.question_id,
    ),
  );
  const total = relevantQids.size;
  const done = responses.filter(
    (r) =>
      relevantQids.has(r.question_id) &&
      r.health_response !== null &&
      r.health_response !== -1 &&
      r.tracking_response !== null,
  ).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { pct, total, done };
}

export const getHealthCheckData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HealthCheckData> => {
    const userId = context.userId;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id,tier,role,team_owner_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    let tier = (profile?.tier ?? "starter") as
      | "starter"
      | "pro"
      | "diagnostic";
    const role = (profile as any)?.role ?? "owner";
    const teamOwnerId = (profile as any)?.team_owner_id ?? null;
    const isTeamMember =
      role === "team_member" || (role === "member" && teamOwnerId != null);

    // Team members inherit their owner's tier — their own tier column is
    // never used for access gating.
    let ownerTierFetched: string | null = null;
    if (isTeamMember && teamOwnerId) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("tier")
        .eq("user_id", teamOwnerId)
        .maybeSingle();
      ownerTierFetched = (ownerProfile?.tier as string) ?? null;
      if (ownerProfile?.tier) {
        tier = ownerProfile.tier as "starter" | "pro" | "diagnostic";
      }
    }

    console.info("[getHealthCheckData] tier resolution", {
      userId,
      role,
      team_owner_id: teamOwnerId,
      isTeamMember,
      ownerProfileTier: ownerTierFetched,
      effectiveTier: tier,
      profileOwnTier: profile?.tier ?? null,
    });

    // Resolve team context (founder + parent assessment) for team members.
    let teamContext: HealthCheckData["teamContext"] | undefined;
    let parentAssessmentId: string | null = null;
    let parentSelectedChildIds: string[] = [];
    if (isTeamMember) {
      const { data: tm } = await supabaseAdmin
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (tm) {
        const { data: team } = await supabaseAdmin
          .from("teams")
          .select("owner_id")
          .eq("id", tm.team_id)
          .maybeSingle();
        const ownerUserId = team?.owner_id ?? null;
        if (ownerUserId) {
          const [{ data: ownerProfile }, { data: ownerCompany }] =
            await Promise.all([
              supabaseAdmin
                .from("profiles")
                .select("first_name,email")
                .eq("user_id", ownerUserId)
                .maybeSingle(),
              supabaseAdmin
                .from("company_profiles")
                .select("company_name")
                .eq("user_id", ownerUserId)
                .maybeSingle(),
            ]);
          teamContext = {
            companyName: ownerCompany?.company_name ?? null,
            ownerFirstName: ownerProfile?.first_name ?? null,
            ownerEmail: ownerProfile?.email ?? null,
          };
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
      }
    }

    // 1. Look for an existing in_progress assessment → use it
    let { data: assessment, error: aErr } = await supabaseAdmin
      .from("assessments")
      .select("id,status,completion_pct,selected_child_ids,submitted_at,completed_at")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);

    // 2. If none, look for the most recent completed assessment → return it
    if (!assessment) {
      const { data: lastCompleted, error: lcErr } = await supabaseAdmin
        .from("assessments")
        .select("id,status,completion_pct,selected_child_ids,submitted_at,completed_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lcErr) throw new Error(lcErr.message);
      assessment = lastCompleted;
    }

    // 3. Auto-create for first-time users.
    //    For team members, seed parent_assessment_id + selected_child_ids.
    if (!assessment) {
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        profile_id: profile?.id ?? null,
        assessment_type: isTeamMember ? "team_member" : tier,
        tier_at_start: isTeamMember ? "team_member" : tier,
        status: "in_progress",
        completion_pct: 0,
      };
      if (isTeamMember) {
        insertPayload.parent_assessment_id = parentAssessmentId;
        insertPayload.selected_child_ids = parentSelectedChildIds;
      }
      const { data: created, error: cErr } = await supabaseAdmin
        .from("assessments")
        .insert(insertPayload as any)
        .select("id,status,completion_pct,selected_child_ids,submitted_at,completed_at")
        .single();
      if (cErr) throw new Error(cErr.message);
      assessment = created;
    }

    const fw = await loadFrameworkAndResponses(assessment!.id);

    // Per-child scores (if calculated)
    const { data: scoresData, error: scErr } = await supabaseAdmin
      .from("assessment_scores")
      .select("child_system_id,health_score,tracking_score")
      .eq("assessment_id", assessment!.id);
    if (scErr) console.error("[health-check] scores fetch failed:", scErr.message);

    // Convert stored UUIDs back to child system codes for the UI
    const storedIds = (assessment!.selected_child_ids ?? []) as string[];
    const selectedCodes = storedIds
      .map((id) => fw.children.find((c) => c.id === id)?.code)
      .filter((code): code is string => Boolean(code));

    // Total unlocked areas: for starter / team_member, count only selected child areas
    const selectedChildIdSet = new Set(
      fw.children.filter((c) => selectedCodes.includes(c.code)).map((c) => c.id),
    );
    const total =
      tier === "starter" || isTeamMember
        ? fw.areas.filter((a) => selectedChildIdSet.has(a.child_system_id)).length
        : countUnlockedAreas(tier, fw.children, fw.areas);

    return {
      tier,
      assessment: {
        id: assessment!.id,
        status: assessment!.status,
        completion_pct: assessment!.completion_pct ?? 0,
        selected_child_ids: selectedCodes,
        submitted_at: (assessment as any).submitted_at ?? null,
        completed_at: (assessment as any).completed_at ?? null,
      },
      parents: fw.parents,
      children: fw.children,
      areas: fw.areas,
      responses: fw.responses,
      scores: (scoresData ?? []) as AssessmentScoreRow[],
      totalUnlockedAreas: total,
      isTeamMember,
      teamContext,
    };
  });


const saveSchema = z.object({
  assessment_id: z.string().uuid(),
  question_id: z.string().uuid(),
  health_response: z.number().int().min(-1).max(4).nullable(),
  tracking_response: z.number().int().min(1).max(5).nullable(),
});

export const saveResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // verify ownership
    const { data: asmt, error: oErr } = await supabaseAdmin
      .from("assessments")
      .select("id,user_id,status,selected_child_ids")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!asmt || asmt.user_id !== userId) {
      throw new Error("Forbidden");
    }
    if (asmt.status === "completed") {
      throw new Error("Assessment already completed");
    }

    // upsert response (composite on assessment_id + question_id)
    const { data: existing, error: eErr } = await supabaseAdmin
      .from("assessment_responses")
      .select("id")
      .eq("assessment_id", data.assessment_id)
      .eq("question_id", data.question_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);

    if (existing) {
      const { error: uErr } = await supabaseAdmin
        .from("assessment_responses")
        .update({
          health_response: data.health_response,
          tracking_response: data.tracking_response,
          answered_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
    } else {
      const { error: iErr } = await supabaseAdmin
        .from("assessment_responses")
        .insert({
          assessment_id: data.assessment_id,
          user_id: userId,
          question_id: data.question_id,
          health_response: data.health_response,
          tracking_response: data.tracking_response,
        });
      if (iErr) throw new Error(iErr.message);
    }

    // Recompute completion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tier,role,team_owner_id")
      .eq("user_id", userId)
      .maybeSingle();
    let tier = (profile?.tier ?? "starter") as string;
    const _role = (profile as any)?.role ?? "owner";
    const _ownerId = (profile as any)?.team_owner_id ?? null;
    if (
      (_role === "team_member" || (_role === "member" && _ownerId)) &&
      _ownerId
    ) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("tier")
        .eq("user_id", _ownerId)
        .maybeSingle();
      if (ownerProfile?.tier) tier = ownerProfile.tier as string;
    }

    const fw = await loadFrameworkAndResponses(data.assessment_id);
    const selectedChildUuids = ((asmt as any).selected_child_ids ?? []) as string[];
    const { pct } = computeCompletionPct(
      tier,
      fw.children,
      fw.areas,
      fw.responses,
      selectedChildUuids,
    );

    const isComplete = pct >= 100;
    const updates: any = {
      completion_pct: pct,
      updated_at: new Date().toISOString(),
    };
    if (isComplete) {
      updates.status = "completed";
      updates.submitted_at = new Date().toISOString();
      updates.completed_at = new Date().toISOString();
    }
    const { error: aErr } = await supabaseAdmin
      .from("assessments")
      .update(updates)
      .eq("id", data.assessment_id);
    if (aErr) throw new Error(aErr.message);

    const profileUpdates: any = {
      assessment_completion_pct: pct,
      last_active_at: new Date().toISOString(),
      assessment_status: isComplete ? "complete" : "in_progress",
    };
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("user_id", userId);
    if (pErr) throw new Error(pErr.message);

    if (isComplete) {
      await supabaseAdmin.rpc("refresh_profile_completion", {
        _user_id: userId,
      });
      try {
        await _calculateAssessmentScoresImpl(data.assessment_id, userId);
      } catch (err) {
        console.error("[scores] calculation failed:", err);
      }
      // If this is a team member completing their Health Check, mark
      // their team_members row active so the founder sees them as "Active".
      try {
        const { data: roleRow } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if ((roleRow?.role ?? "owner") === "team_member") {
          await supabaseAdmin
            .from("team_members")
            .update({ status: "active" })
            .eq("user_id", userId);
        }
      } catch (err) {
        console.error("[team_members] status update failed:", err);
      }
    }

    return { ok: true, completion_pct: pct, completed: isComplete };
  });

const selectionSchema = z.object({
  assessment_id: z.string().uuid(),
  selected_child_ids: z.array(z.string().min(1).max(64)).max(50),
});

export const updateSelectedChildIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => selectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: asmt, error: oErr } = await supabaseAdmin
      .from("assessments")
      .select("id,user_id,status")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!asmt || asmt.user_id !== userId) throw new Error("Forbidden");
    if (asmt.status === "completed") throw new Error("Assessment already completed");

    // Convert codes to UUIDs before saving
    const { data: childSystems, error: csError } = await (supabaseAdmin as any)
      .schema('revhealth2')
      .from('child_systems')
      .select('id, code')
      .in('code', data.selected_child_ids);

    if (csError) throw new Error(csError.message);

    const uuids = data.selected_child_ids.map(code =>
      (childSystems ?? []).find((cs: any) => cs.code === code)?.id
    ).filter(Boolean);

    const { error: uErr } = await supabaseAdmin
      .from("assessments")
      .update({
        selected_child_ids: uuids,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.assessment_id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, selected_child_ids: uuids };
  });


// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

const scoreSchema = z.object({
  assessmentId: z.string().uuid(),
  userId: z.string().uuid(),
});

type ScoreRow = {
  health_response: number | null;
  tracking_response: number | null;
  question_id: string;
};

async function _calculateAssessmentScoresImpl(
  assessmentId: string,
  userId: string,
) {
  // ownership check
  const { data: asmt, error: oErr } = await supabaseAdmin
    .from("assessments")
    .select("id,user_id")
    .eq("id", assessmentId)
    .maybeSingle();
  if (oErr) throw new Error(oErr.message);
  if (!asmt || asmt.user_id !== userId) throw new Error("Forbidden");

  // Step 1: responses + framework (cross-schema joined in memory)
  const [respRes, questionsRes, childrenRes] = await Promise.all([
    supabaseAdmin
      .from("assessment_responses")
      .select("question_id,health_response,tracking_response")
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId),
    (supabaseAdmin as any)
      .schema("revhealth2")
      .from("questions")
      .select("id,child_system_id,evaluation_area_id"),
    (supabaseAdmin as any)
      .schema("revhealth2")
      .from("child_systems")
      .select("id,code,parent_system_id"),
  ]);
  for (const r of [respRes, questionsRes, childrenRes]) {
    if ((r as any).error) throw new Error((r as any).error.message);
  }

  const qById = new Map<string, { child_system_id: string }>();
  for (const q of questionsRes.data ?? []) {
    qById.set(q.id, { child_system_id: q.child_system_id });
  }
  const cById = new Map<string, { code: string }>();
  for (const c of childrenRes.data ?? []) {
    cById.set(c.id, { code: c.code });
  }

  // Group responses by child_system_id, filter out skipped (health <= 0)
  const byChild = new Map<
    string,
    { health: number[]; tracking: number[] }
  >();
  for (const r of (respRes.data ?? []) as ScoreRow[]) {
    const q = qById.get(r.question_id);
    if (!q) continue;
    if (r.health_response === null || r.health_response <= 0) continue;
    const bucket = byChild.get(q.child_system_id) ?? {
      health: [],
      tracking: [],
    };
    bucket.health.push((r.health_response / 4) * 100);
    if (r.tracking_response !== null) {
      bucket.tracking.push((r.tracking_response / 5) * 100);
    }
    byChild.set(q.child_system_id, bucket);
  }

  if (byChild.size === 0) {
    throw new Error(
      `No qualifying responses found for assessment ${assessmentId}`,
    );
  }

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const childHealthScores: number[] = [];
  const childTrackingScores: number[] = [];
  let writtenCount = 0;

  for (const [childSystemId, vals] of byChild.entries()) {
    const healthScore = round1(avg(vals.health));
    const trackingScore = round1(avg(vals.tracking));
    const visibilityGap = round1(healthScore - trackingScore);
    const isSoftShadow = healthScore >= 60 && trackingScore < 40;
    const isHardShadow = healthScore >= 60 && trackingScore < 20;
    const severity =
      healthScore < 40
        ? "critical"
        : healthScore < 60
          ? "fragile"
          : healthScore < 75
            ? "stable"
            : "strong";

    const code = cById.get(childSystemId)?.code ?? childSystemId;
    console.log(
      "[scores] childCode:",
      code,
      "health:",
      healthScore,
      "tracking:",
      trackingScore,
    );

    const { error: upErr } = await supabaseAdmin
      .from("assessment_scores")
      .upsert(
        {
          assessment_id: assessmentId,
          user_id: userId,
          child_system_id: childSystemId,
          health_score: healthScore,
          tracking_score: trackingScore,
          visibility_gap: visibilityGap,
          is_soft_shadow: isSoftShadow,
          is_hard_shadow: isHardShadow,
          severity,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id,child_system_id" },
      );
    if (upErr) {
      console.error(
        "[scores] upsert failed for child",
        code,
        upErr.message,
      );
      continue;
    }
    childHealthScores.push(healthScore);
    childTrackingScores.push(trackingScore);
    writtenCount++;
  }

  const overall_health_score = round1(avg(childHealthScores));
  const overall_tracking_score = round1(avg(childTrackingScores));

  const { error: aErr } = await supabaseAdmin
    .from("assessments")
    .update({
      overall_health_score,
      overall_tracking_score,
      calculated_at: new Date().toISOString(),
    })
    .eq("id", assessmentId);
  if (aErr) console.error("[scores] assessment overall update failed:", aErr.message);

  return {
    ok: true as const,
    children: writtenCount,
    overall_health_score,
    overall_tracking_score,
  };
}

export const calculateAssessmentScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scoreSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) throw new Error("Forbidden");
    return _calculateAssessmentScoresImpl(data.assessmentId, context.userId);
  });

// ---------------------------------------------------------------------------
// startNewAssessment — explicit reassessment trigger
// ---------------------------------------------------------------------------

export const startNewAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id,tier,role,team_owner_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    let tier = (profile?.tier ?? "starter") as "starter" | "pro" | "diagnostic";
    const _role = (profile as any)?.role ?? "owner";
    const _ownerId = (profile as any)?.team_owner_id ?? null;
    if (
      (_role === "team_member" || (_role === "member" && _ownerId)) &&
      _ownerId
    ) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("tier")
        .eq("user_id", _ownerId)
        .maybeSingle();
      if (ownerProfile?.tier) {
        tier = ownerProfile.tier as "starter" | "pro" | "diagnostic";
      }
    }

    // If there's already an in_progress one, reuse it instead of stacking duplicates.
    const { data: existing, error: eErr } = await supabaseAdmin
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (existing) return { ok: true as const, assessment_id: existing.id };

    const { data: created, error: cErr } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id: userId,
        profile_id: profile?.id ?? null,
        assessment_type: tier,
        tier_at_start: tier,
        status: "in_progress",
        completion_pct: 0,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    return { ok: true as const, assessment_id: created.id };
  });

// ---------------------------------------------------------------------------
// editCompletedResponse — edit answers on a completed assessment within
// the 7-day edit window, then recompute scores.
// ---------------------------------------------------------------------------

const editSchema = z.object({
  assessment_id: z.string().uuid(),
  question_id: z.string().uuid(),
  health_response: z.number().int().min(-1).max(4).nullable(),
  tracking_response: z.number().int().min(1).max(5).nullable(),
});

const LOCK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const editCompletedResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const { data: asmt, error: oErr } = await supabaseAdmin
      .from("assessments")
      .select("id,user_id,status,submitted_at,completed_at")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!asmt || asmt.user_id !== userId) throw new Error("Forbidden");
    if (asmt.status !== "completed") throw new Error("Assessment is not completed");

    const anchor = (asmt as any).submitted_at ?? (asmt as any).completed_at;
    if (!anchor) throw new Error("Missing submission date");
    const lockAt = new Date(anchor).getTime() + LOCK_WINDOW_MS;
    if (Date.now() > lockAt) throw new Error("Edit window closed");

    const { data: existing, error: eErr } = await supabaseAdmin
      .from("assessment_responses")
      .select("id")
      .eq("assessment_id", data.assessment_id)
      .eq("question_id", data.question_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);

    if (existing) {
      const { error: uErr } = await supabaseAdmin
        .from("assessment_responses")
        .update({
          health_response: data.health_response,
          tracking_response: data.tracking_response,
          answered_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
    } else {
      const { error: iErr } = await supabaseAdmin
        .from("assessment_responses")
        .insert({
          assessment_id: data.assessment_id,
          user_id: userId,
          question_id: data.question_id,
          health_response: data.health_response,
          tracking_response: data.tracking_response,
        });
      if (iErr) throw new Error(iErr.message);
    }

    try {
      await _calculateAssessmentScoresImpl(data.assessment_id, userId);
    } catch (err) {
      console.error("[edit] score recalc failed:", err);
    }

    return { ok: true as const };
  });
