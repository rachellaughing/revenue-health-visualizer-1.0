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
      .select("id,tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    const tier = (profile?.tier ?? "starter") as
      | "starter"
      | "pro"
      | "diagnostic";

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

    // 3. Only auto-create for first-time users (no in_progress AND no completed).
    //    Reassessment is an explicit action — see startNewAssessment.
    if (!assessment) {
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
        .select("id,status,completion_pct,selected_child_ids,submitted_at,completed_at")
        .single();
      if (cErr) throw new Error(cErr.message);
      assessment = created;
    }

    const fw = await loadFrameworkAndResponses(assessment!.id);

    // Convert stored UUIDs back to child system codes for the UI
    const storedIds = (assessment!.selected_child_ids ?? []) as string[];
    const selectedCodes = storedIds
      .map((id) => fw.children.find((c) => c.id === id)?.code)
      .filter((code): code is string => Boolean(code));

    // Total unlocked areas: for starter, count only selected child areas
    const selectedChildIdSet = new Set(
      fw.children.filter((c) => selectedCodes.includes(c.code)).map((c) => c.id),
    );
    const total =
      tier === "starter"
        ? fw.areas.filter((a) => selectedChildIdSet.has(a.child_system_id)).length
        : countUnlockedAreas(tier, fw.children, fw.areas);

    return {
      tier,
      assessment: {
        id: assessment!.id,
        status: assessment!.status,
        completion_pct: assessment!.completion_pct ?? 0,
        selected_child_ids: selectedCodes,
      },
      parents: fw.parents,
      children: fw.children,
      areas: fw.areas,
      responses: fw.responses,
      totalUnlockedAreas: total,
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
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = (profile?.tier ?? "starter") as string;

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
      .select("id,tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    const tier = (profile?.tier ?? "starter") as "starter" | "pro" | "diagnostic";

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
