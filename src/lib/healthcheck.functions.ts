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

export type HealthCheckData = {
  tier: "starter" | "pro" | "diagnostic";
  assessment: {
    id: string;
    status: string;
    completion_pct: number;
    selected_child_ids: string[];
  };
  parents: ParentSystem[];
  children: ChildSystem[];
  areas: Area[];
  responses: ResponseRow[];
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
): { pct: number; total: number; done: number } {
  const total = countUnlockedAreas(tier, children, areas);
  const unlockedChildIds = new Set(
    children.filter((c) => c.access_tier === "free" || tier !== "starter").map(
      (c) => c.id,
    ),
  );
  const unlockedQids = new Set(
    areas.filter((a) => unlockedChildIds.has(a.child_system_id)).map(
      (a) => a.question_id,
    ),
  );
  const done = responses.filter(
    (r) =>
      unlockedQids.has(r.question_id) &&
      r.health_response !== null &&
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

    // Find or create in_progress assessment
    let { data: assessment, error: aErr } = await supabaseAdmin
      .from("assessments")
      .select("id,status,completion_pct,selected_child_ids")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);

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
        .select("id,status,completion_pct,selected_child_ids")
        .single();
      if (cErr) throw new Error(cErr.message);
      assessment = created;
    }

    const fw = await loadFrameworkAndResponses(assessment!.id);
    const total = countUnlockedAreas(tier, fw.children, fw.areas);

    return {
      tier,
      assessment: {
        id: assessment!.id,
        status: assessment!.status,
        completion_pct: assessment!.completion_pct ?? 0,
        selected_child_ids: (assessment!.selected_child_ids ?? []) as string[],
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
      .select("id,user_id,status")
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
    const { pct } = computeCompletionPct(
      tier,
      fw.children,
      fw.areas,
      fw.responses,
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

    const { error: uErr } = await supabaseAdmin
      .from("assessments")
      .update({
        selected_child_ids: data.selected_child_ids,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.assessment_id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, selected_child_ids: data.selected_child_ids };
  });

