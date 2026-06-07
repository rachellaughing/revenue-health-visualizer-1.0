import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Tier = "starter" | "pro" | "diagnostic";

export type ParentScore = {
  id: string;
  code: string; // POS | AUTH | CONV | LFC | VIS
  name: string;
  color_hex: string;
  sort_order: number;
  healthScore: number;
  trackingScore: number;
  visibilityGap: number;
  severity: "critical" | "fragile" | "stable" | "strong";
  isSoftShadow: boolean;
  isHardShadow: boolean;
  assessed: number; // # child systems with scores
  childCount: number;
};

export type RiskItem = { rank: number; system: string; text: string };

export type SystemNarratives = {
  POS: string | null;
  AUTH: string | null;
  CONV: string | null;
  LFC: string | null;
  VIS: string | null;
};

export type Narrative = {
  headline: string;
  body: string;
  risks: RiskItem[];
  systems?: SystemNarratives;
} | null;

export type ExecutiveSummary = {
  tier: Tier;
  profile: {
    first_name: string | null;
    business_name: string | null;
  };
  company: {
    annual_revenue: string | null;
    funding_stage: string | null;
    pain_points: string[] | null;
    company_name: string | null;
  };
  assessment: {
    id: string;
    overall_health_score: number;
    submitted_at: string | null;
    assessment_version: number | null;
    tier_at_start: string | null;
  };
  systems: ParentScore[];
  overallScore: number;
  narrative: Narrative;
  quarter: string; // "Q1 2025"
};

const PARENT_CODE_TO_SYSTEM_NAME: Record<string, string> = {
  POS: "Positioning",
  AUTH: "Authority",
  CONV: "Conversion",
  LFC: "Lifecycle",
  VIS: "Visibility",
};

function severityFor(health: number): ParentScore["severity"] {
  if (health < 40) return "critical";
  if (health < 60) return "fragile";
  if (health < 75) return "stable";
  return "strong";
}

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

async function loadCoreData(assessmentId: string, userId: string) {
  const [asmtRes, scoresRes, parentsRes, childrenRes, profileRes, companyRes, narrRes] =
    await Promise.all([
      supabaseAdmin
        .from("assessments")
        .select(
          "id,user_id,status,overall_health_score,overall_tracking_score,submitted_at,assessment_version,tier_at_start,selected_child_ids",
        )
        .eq("id", assessmentId)
        .maybeSingle(),
      supabaseAdmin
        .from("assessment_scores")
        .select(
          "child_system_id,health_score,tracking_score,visibility_gap,is_soft_shadow,is_hard_shadow,severity",
        )
        .eq("assessment_id", assessmentId)
        .eq("user_id", userId),
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("parent_systems")
        .select("id,code,name,color_hex,sort_order")
        .order("sort_order"),
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("child_systems")
        .select("id,parent_system_id,code,name"),
      supabaseAdmin
        .from("profiles")
        .select("first_name,tier,business_name")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("company_profiles")
        .select("company_name,annual_revenue,funding_stage,pain_points")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("report_narratives")
        .select("exec_headline,exec_body,top_risks,narrative_pos,narrative_auth,narrative_conv,narrative_lfc,narrative_vis")
        .eq("assessment_id", assessmentId)
        .maybeSingle(),
    ]);

  for (const r of [
    asmtRes,
    scoresRes,
    parentsRes,
    childrenRes,
    profileRes,
    companyRes,
    narrRes,
  ]) {
    if ((r as any).error) throw new Error((r as any).error.message);
  }

  if (!asmtRes.data) throw new Error("Assessment not found");
  if (asmtRes.data.user_id !== userId) throw new Error("Forbidden");

  return {
    assessment: asmtRes.data,
    scores: scoresRes.data ?? [],
    parents: parentsRes.data ?? [],
    children: childrenRes.data ?? [],
    profile: profileRes.data,
    company: companyRes.data,
    narrative: narrRes.data,
  };
}

function aggregateByParent(
  scores: any[],
  parents: any[],
  children: any[],
): ParentScore[] {
  const childToParent = new Map<string, string>();
  const childCountByParent = new Map<string, number>();
  for (const c of children) {
    childToParent.set(c.id, c.parent_system_id);
    childCountByParent.set(
      c.parent_system_id,
      (childCountByParent.get(c.parent_system_id) ?? 0) + 1,
    );
  }

  const byParent = new Map<
    string,
    { health: number[]; tracking: number[]; gap: number[]; soft: number; hard: number }
  >();

  for (const s of scores) {
    const pid = childToParent.get(s.child_system_id);
    if (!pid) continue;
    const bucket = byParent.get(pid) ?? {
      health: [],
      tracking: [],
      gap: [],
      soft: 0,
      hard: 0,
    };
    if (s.health_score !== null) bucket.health.push(Number(s.health_score));
    if (s.tracking_score !== null) bucket.tracking.push(Number(s.tracking_score));
    if (s.visibility_gap !== null) bucket.gap.push(Number(s.visibility_gap));
    if (s.is_soft_shadow) bucket.soft++;
    if (s.is_hard_shadow) bucket.hard++;
    byParent.set(pid, bucket);
  }

  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0;

  return parents
    .map((p) => {
      const b = byParent.get(p.id);
      const healthScore = b ? avg(b.health) : 0;
      const trackingScore = b ? avg(b.tracking) : 0;
      const visibilityGap = b ? avg(b.gap) : 0;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        color_hex: p.color_hex,
        sort_order: p.sort_order,
        healthScore,
        trackingScore,
        visibilityGap,
        severity: severityFor(healthScore),
        isSoftShadow: (b?.soft ?? 0) > 0,
        isHardShadow: (b?.hard ?? 0) > 0,
        assessed: b?.health.length ?? 0,
        childCount: childCountByParent.get(p.id) ?? 0,
      } as ParentScore;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ---------------------------------------------------------------------------
// AI narrative
// ---------------------------------------------------------------------------

const narrativeJsonSchema = z.object({
  headline: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  risks: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(3),
        system: z.string().min(1).max(80),
        text: z.string().min(1).max(800),
      }),
    )
    .length(3),
  systems: z.object({
    POS: z.string().min(1).max(2000),
    AUTH: z.string().min(1).max(2000),
    CONV: z.string().min(1).max(2000),
    LFC: z.string().min(1).max(2000),
    VIS: z.string().min(1).max(2000),
  }),
});

function buildNarrativePrompt(args: {
  companyName: string;
  annualRevenue: string;
  fundingStage: string;
  overallScore: number;
  systems: ParentScore[];
  painPoints: string[];
}): string {
  const sysLine = (code: string) => {
    const s = args.systems.find((x) => x.code === code);
    if (!s) return `- ${PARENT_CODE_TO_SYSTEM_NAME[code]}: n/a`;
    return `- ${s.name}: ${s.healthScore} (tracking: ${s.trackingScore})`;
  };
  const withHealth = args.systems.filter((s) => s.assessed > 0);
  const weakest = withHealth.length
    ? [...withHealth].sort((a, b) => a.healthScore - b.healthScore)[0]
    : null;
  const strongest = withHealth.length
    ? [...withHealth].sort((a, b) => b.healthScore - a.healthScore)[0]
    : null;
  const shadows = args.systems
    .filter((s) => s.isHardShadow || s.isSoftShadow)
    .map((s) => `${s.name}${s.isHardShadow ? " (hard)" : " (soft)"}`);

  return `You are writing an executive summary for a Revenue Health report.
Use ONLY the data provided below. Do not reference anything outside it.
Do not make up facts. Do not use generic language.

Company: ${args.companyName} · ${args.annualRevenue} · ${args.fundingStage}
Overall score: ${args.overallScore}/100
System scores:
${sysLine("POS")}
${sysLine("AUTH")}
${sysLine("CONV")}
${sysLine("LFC")}
${sysLine("VIS")}
Weakest system: ${weakest ? `${weakest.name} (${weakest.healthScore})` : "n/a"}
Strongest system: ${strongest ? `${strongest.name} (${strongest.healthScore})` : "n/a"}
Shadow systems detected: ${shadows.length ? shadows.join(", ") : "none"}
Founder-reported pain points: ${args.painPoints.length ? args.painPoints.join(", ") : "none reported"}

Write:
1. HEADLINE: One sentence, max 8 words, specific to this data. Not generic.
2. BODY: 2-3 sentences describing the key pattern. Reference specific systems by name. Be direct.
3. RISKS: The top 3 risks for this business, chosen as the 3 lowest-scoring systems by health score. For each risk, give the system name and a 2-3 sentence specific insight grounded in the scores and pain points above. Number them rank 1 (highest risk) to 3.
4. SYSTEMS: For each of the 5 systems (Positioning, Authority, Conversion, Lifecycle, Visibility), write ONE paragraph (3-5 sentences) of specific analysis grounded in that system's health score, tracking score, gap, and any shadow flags. Reference subsystem-level patterns when meaningful. No generic filler.

Respond in this exact JSON format, with no surrounding prose or code fences:
{"headline":"...","body":"...","risks":[{"rank":1,"system":"...","text":"..."},{"rank":2,"system":"...","text":"..."},{"rank":3,"system":"...","text":"..."}],"systems":{"POS":"...","AUTH":"...","CONV":"...","LFC":"...","VIS":"..."}}`;
}

function stripCodeFences(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

async function _generateReportNarrativeImpl(
  assessmentId: string,
  userId: string,
): Promise<{ headline: string; body: string; risks: RiskItem[]; systems: SystemNarratives }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const core = await loadCoreData(assessmentId, userId);
  const systems = aggregateByParent(core.scores, core.parents, core.children);
  const overallScore =
    core.assessment.overall_health_score !== null &&
    core.assessment.overall_health_score !== undefined
      ? Math.round(Number(core.assessment.overall_health_score))
      : Math.round(
          systems.filter((s) => s.assessed > 0).reduce((a, b) => a + b.healthScore, 0) /
            Math.max(systems.filter((s) => s.assessed > 0).length, 1),
        );

  const prompt = buildNarrativePrompt({
    companyName: core.company?.company_name ?? core.profile?.business_name ?? "Your company",
    annualRevenue: core.company?.annual_revenue ?? "Not specified",
    fundingStage: core.company?.funding_stage ?? "Not specified",
    overallScore,
    systems,
    painPoints: (core.company?.pain_points as string[] | null) ?? [],
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[narrative] anthropic error", response.status, errText);
    throw new Error(`Anthropic API error ${response.status}`);
  }

  const json = (await response.json()) as any;

  const text: string = json?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Anthropic");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    console.error("[narrative] failed to parse JSON:", text);
    throw new Error("Narrative response was not valid JSON");
  }

  const validated = narrativeJsonSchema.parse(parsed);

  const { error: upErr } = await supabaseAdmin
    .from("report_narratives")
    .upsert(
      {
        assessment_id: assessmentId,
        user_id: userId,
        exec_headline: validated.headline,
        exec_body: validated.body,
        top_risks: validated.risks,
        narrative_pos: validated.systems.POS,
        narrative_auth: validated.systems.AUTH,
        narrative_conv: validated.systems.CONV,
        narrative_lfc: validated.systems.LFC,
        narrative_vis: validated.systems.VIS,
        model_used: "claude-sonnet-4-5-20250929",
        generated_at: new Date().toISOString(),
      },
      { onConflict: "assessment_id" },
    );
  if (upErr) {
    console.error("[narrative] upsert failed:", upErr.message);
    throw new Error(upErr.message);
  }

  return validated;
}

const generateSchema = z.object({ assessmentId: z.string().uuid() });

export const generateReportNarrative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => generateSchema.parse(d))
  .handler(async ({ data, context }) => {
    return _generateReportNarrativeImpl(data.assessmentId, context.userId);
  });

// ---------------------------------------------------------------------------
// Executive summary fetch
// ---------------------------------------------------------------------------

const summarySchema = z
  .object({ assessmentId: z.string().uuid().optional() })
  .optional();

export const getExecutiveSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(async ({ data, context }): Promise<ExecutiveSummary | { error: "no_completed_assessment" }> => {
    const userId = context.userId;

    let assessmentId = data?.assessmentId;
    if (!assessmentId) {
      const { data: latest, error } = await supabaseAdmin
        .from("assessments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!latest) return { error: "no_completed_assessment" as const };
      assessmentId = latest.id;
    }

    const core = await loadCoreData(assessmentId!, userId);
    const systems = aggregateByParent(core.scores, core.parents, core.children);
    const assessedSystems = systems.filter((s) => s.assessed > 0);
    const overallScore =
      core.assessment.overall_health_score !== null &&
      core.assessment.overall_health_score !== undefined
        ? Math.round(Number(core.assessment.overall_health_score))
        : assessedSystems.length
          ? Math.round(
              assessedSystems.reduce((a, b) => a + b.healthScore, 0) / assessedSystems.length,
            )
          : 0;

    const submittedAt = core.assessment.submitted_at
      ? new Date(core.assessment.submitted_at)
      : new Date();

    // narrative: use cached or generate
    let narrative: Narrative = null;
    if (core.narrative?.exec_headline && core.narrative?.exec_body && core.narrative?.top_risks) {
      narrative = {
        headline: core.narrative.exec_headline,
        body: core.narrative.exec_body,
        risks: core.narrative.top_risks as RiskItem[],
        systems: {
          POS: (core.narrative as any).narrative_pos ?? null,
          AUTH: (core.narrative as any).narrative_auth ?? null,
          CONV: (core.narrative as any).narrative_conv ?? null,
          LFC: (core.narrative as any).narrative_lfc ?? null,
          VIS: (core.narrative as any).narrative_vis ?? null,
        },
      };
    } else {
      try {
        narrative = await _generateReportNarrativeImpl(assessmentId!, userId);
      } catch (err) {
        console.error("[exec-summary] narrative generation failed:", err);
        narrative = null;
      }
    }

    const tier = (core.profile?.tier ?? "starter") as Tier;

    return {
      tier,
      profile: {
        first_name: core.profile?.first_name ?? null,
        business_name: core.profile?.business_name ?? null,
      },
      company: {
        company_name: core.company?.company_name ?? null,
        annual_revenue: core.company?.annual_revenue ?? null,
        funding_stage: core.company?.funding_stage ?? null,
        pain_points: (core.company?.pain_points as string[] | null) ?? null,
      },
      assessment: {
        id: core.assessment.id,
        overall_health_score: Number(core.assessment.overall_health_score ?? overallScore),
        submitted_at: core.assessment.submitted_at,
        assessment_version: core.assessment.assessment_version,
        tier_at_start: core.assessment.tier_at_start,
      },
      systems,
      overallScore,
      narrative,
      quarter: quarterLabel(submittedAt),
    };
  });

// ---------------------------------------------------------------------------
// Revenue System Health
// ---------------------------------------------------------------------------

export type ChildSystemScore = {
  id: string;
  parentCode: string;
  code: string;
  name: string;
  healthScore: number;
  trackingScore: number;
  visibilityGap: number;
  severity: "critical" | "fragile" | "stable" | "strong";
  isShadow: boolean;
  assessed: boolean;
};

export type SystemHealthSystem = ParentScore & {
  children: ChildSystemScore[];
  narrative: string | null;
};

export type RevenueSystemHealth = {
  tier: Tier;
  firstName: string | null;
  assessment: {
    id: string;
    submitted_at: string | null;
    selected_child_ids: string[] | null;
  };
  systems: SystemHealthSystem[];
};

export const getRevenueSystemHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(
    async ({
      data,
      context,
    }): Promise<RevenueSystemHealth | { error: "no_completed_assessment" }> => {
      const userId = context.userId;

      let assessmentId = data?.assessmentId;
      if (!assessmentId) {
        const { data: latest, error } = await supabaseAdmin
          .from("assessments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!latest) return { error: "no_completed_assessment" as const };
        assessmentId = latest.id;
      }

      const core = await loadCoreData(assessmentId!, userId);
      const parentAgg = aggregateByParent(core.scores, core.parents, core.children);

      // Map child_system_id -> score row
      const scoreByChild = new Map<string, any>();
      for (const s of core.scores) scoreByChild.set(s.child_system_id, s);

      const parentById = new Map<string, any>();
      for (const p of core.parents) parentById.set(p.id, p);

      // Group children by parent
      const childrenByParent = new Map<string, any[]>();
      for (const c of core.children) {
        const arr = childrenByParent.get(c.parent_system_id) ?? [];
        arr.push(c);
        childrenByParent.set(c.parent_system_id, arr);
      }

      const narr = core.narrative as any;

      const systems: SystemHealthSystem[] = parentAgg.map((p) => {
        const kids = (childrenByParent.get(p.id) ?? []).map((c: any): ChildSystemScore => {
          const s = scoreByChild.get(c.id);
          const health = s ? Number(s.health_score ?? 0) : 0;
          const tracking = s ? Number(s.tracking_score ?? 0) : 0;
          const visibilityGap =
            s && s.visibility_gap !== null ? Number(s.visibility_gap) : health - tracking;
          return {
            id: c.id,
            parentCode: p.code,
            code: c.code,
            name: c.name,
            healthScore: Math.round(health),
            trackingScore: Math.round(tracking),
            visibilityGap: Math.round(visibilityGap),
            severity: severityFor(health),
            isShadow: health >= 60 && tracking < 40,
            assessed: !!s,
          };
        });

        const key = `narrative_${p.code.toLowerCase()}`;
        const narrative: string | null = narr ? (narr[key] ?? null) : null;

        return { ...p, children: kids, narrative };
      });

      const tier = (core.profile?.tier ?? "starter") as Tier;

      return {
        tier,
        firstName: core.profile?.first_name ?? null,
        assessment: {
          id: core.assessment.id,
          submitted_at: core.assessment.submitted_at,
          selected_child_ids: (core.assessment as any).selected_child_ids ?? null,
        },
        systems,
      };
    },
  );

// ---------------------------------------------------------------------------
// Top Opportunities
// ---------------------------------------------------------------------------

export type CascadeImpact = {
  system: string;
  reason: string;
  score: number | null;
};

export type OpportunityItem = {
  childSystemId: string;
  code: string;
  name: string;
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  healthScore: number;
  trackingScore: number;
  severity: "critical" | "fragile" | "stable" | "strong";
  opportunityScore: number;
  coreSymptom: string;
  likelyRootCause: string;
  cascadeImpacts: CascadeImpact[];
  effortLevel: "Low" | "Medium" | "High";
  timeframe: string;
  assessed: boolean;
};

export type TopOpportunities = {
  tier: Tier;
  firstName: string | null;
  assessment: { id: string; submitted_at: string | null };
  selectedChildIds: string[];
  opportunities: OpportunityItem[];
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function illustrativeScore(seed: string, code: string) {
  const h = hashStr(`${seed}:${code}`);
  const healthScore = 40 + (h % 45);
  const trackingScore = Math.max(15, healthScore - 10 - ((h >> 8) % 25));
  return { healthScore, trackingScore };
}

export const getTopOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(
    async ({
      data,
      context,
    }): Promise<TopOpportunities | { error: "no_completed_assessment" }> => {
      const userId = context.userId;

      let assessmentId = data?.assessmentId;
      if (!assessmentId) {
        const { data: latest, error } = await supabaseAdmin
          .from("assessments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!latest) return { error: "no_completed_assessment" as const };
        assessmentId = latest.id;
      }

      const [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, profileRes] =
        await Promise.all([
          supabaseAdmin
            .from("assessments")
            .select("id,user_id,submitted_at,selected_child_ids")
            .eq("id", assessmentId)
            .maybeSingle(),
          supabaseAdmin
            .from("assessment_scores")
            .select("child_system_id,health_score,tracking_score,severity")
            .eq("assessment_id", assessmentId)
            .eq("user_id", userId),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("parent_systems")
            .select("id,code,name,color_hex,sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("child_systems")
            .select("id,parent_system_id,code,name,sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("failure_map")
            .select(
              "child_system_id,core_symptoms,likely_root_causes,impacted_system_1,impact_reason_1,impacted_system_2,impact_reason_2,impacted_system_3,impact_reason_3",
            ),
          supabaseAdmin
            .from("profiles")
            .select("first_name,tier")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

      for (const r of [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, profileRes]) {
        if ((r as any).error) throw new Error((r as any).error.message);
      }
      if (!asmtRes.data) throw new Error("Assessment not found");
      if (asmtRes.data.user_id !== userId) throw new Error("Forbidden");

      const parents = (parentsRes.data ?? []) as any[];
      const children = (childrenRes.data ?? []) as any[];
      const scores = (scoresRes.data ?? []) as any[];
      const failures = (failureRes.data ?? []) as any[];

      const parentById = new Map<string, any>();
      for (const p of parents) parentById.set(p.id, p);

      const scoreByChild = new Map<string, any>();
      for (const s of scores) scoreByChild.set(s.child_system_id, s);

      const failureByChild = new Map<string, any>();
      for (const f of failures) failureByChild.set(f.child_system_id, f);

      // First pass: compute health for every child (real or illustrative)
      const seed = assessmentId!;
      type ChildInfo = {
        id: string;
        code: string;
        name: string;
        parent: any;
        healthScore: number;
        trackingScore: number;
        assessed: boolean;
      };
      const childInfoById = new Map<string, ChildInfo>();
      const childInfoByName = new Map<string, ChildInfo>();
      for (const c of children) {
        const s = scoreByChild.get(c.id);
        const assessed = !!s;
        const healthScore = assessed
          ? Math.round(Number(s.health_score ?? 0))
          : illustrativeScore(seed, c.code).healthScore;
        const trackingScore = assessed
          ? Math.round(Number(s.tracking_score ?? 0))
          : illustrativeScore(seed, c.code).trackingScore;
        const info: ChildInfo = {
          id: c.id,
          code: c.code,
          name: c.name,
          parent: parentById.get(c.parent_system_id),
          healthScore,
          trackingScore,
          assessed,
        };
        childInfoById.set(c.id, info);
        childInfoByName.set(c.name.trim().toLowerCase(), info);
      }

      const opportunities: OpportunityItem[] = [];
      for (const c of children) {
        const info = childInfoById.get(c.id)!;
        const f = failureByChild.get(c.id);

        const rawImpacts = [
          { sys: f?.impacted_system_1, reason: f?.impact_reason_1 },
          { sys: f?.impacted_system_2, reason: f?.impact_reason_2 },
          { sys: f?.impacted_system_3, reason: f?.impact_reason_3 },
        ];
        const cascadeImpacts: CascadeImpact[] = rawImpacts
          .filter((x) => x.sys && x.reason)
          .map((x) => {
            const match = childInfoByName.get(String(x.sys).trim().toLowerCase());
            return {
              system: String(x.sys),
              reason: String(x.reason),
              score: match ? match.healthScore : null,
            };
          });

        const weakCascadeCount = cascadeImpacts.filter(
          (i) => i.score !== null && i.score < 60,
        ).length;
        const baseScore = 100 - info.healthScore;
        const multiplier = 1 + 0.15 * weakCascadeCount;
        const opportunityScore = Math.round(baseScore * multiplier);

        const severity: OpportunityItem["severity"] =
          info.healthScore < 40
            ? "critical"
            : info.healthScore < 60
              ? "fragile"
              : info.healthScore < 75
                ? "stable"
                : "strong";

        const effortLevel: OpportunityItem["effortLevel"] =
          info.healthScore < 40 ? "High" : info.healthScore < 60 ? "Medium" : "Low";
        const timeframe =
          effortLevel === "High"
            ? "90–180 days"
            : effortLevel === "Medium"
              ? "60–120 days"
              : "14–60 days";

        opportunities.push({
          childSystemId: info.id,
          code: info.code,
          name: info.name,
          parentCode: info.parent?.code ?? "",
          parentName: info.parent?.name ?? "",
          parentColorHex: info.parent?.color_hex ?? "#888880",
          healthScore: info.healthScore,
          trackingScore: info.trackingScore,
          severity,
          opportunityScore,
          coreSymptom: f?.core_symptoms ?? "",
          likelyRootCause: f?.likely_root_causes ?? "",
          cascadeImpacts,
          effortLevel,
          timeframe,
          assessed: info.assessed,
        });
      }

      opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

      const tier = ((profileRes.data?.tier ?? "starter") as Tier);

      return {
        tier,
        firstName: profileRes.data?.first_name ?? null,
        assessment: {
          id: asmtRes.data.id,
          submitted_at: asmtRes.data.submitted_at,
        },
        selectedChildIds: ((asmtRes.data as any).selected_child_ids ?? []) as string[],
        opportunities,
      };
    },
  );

// ---------------------------------------------------------------------------
// Revenue at Risk
// ---------------------------------------------------------------------------

export type RiskCategory = "churn" | "expansion" | "visibility" | "conversion" | "acquisition";

export type RiskItemFull = {
  childSystemId: string;
  code: string;
  name: string;
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  healthScore: number;
  trackingScore: number;
  visibilityGap: number;
  isSoftShadow: boolean;
  severity: "critical" | "fragile" | "stable" | "strong";
  riskCategory: RiskCategory;
  riskLabel: string;
  financialDriverLabel: string;
  symptom: string;
  assessed: boolean;
};

export type RevenueAtRisk = {
  tier: Tier;
  firstName: string | null;
  assessment: { id: string; submitted_at: string | null };
  selectedChildIds: string[];
  company: {
    annual_revenue: string | null;
    acv: number | null;
    cac: number | null;
    estimated_ltv: number | null;
    avg_close_rate: string | null;
    annual_churn: string | null;
  };
  items: RiskItemFull[];
};

const RISK_CATEGORY_BY_CODE: Record<string, { cat: RiskCategory; label: string; driver: string }> = {
  // churn
  RET: { cat: "churn", label: "Churn Exposure", driver: "Annual churn exposure" },
  CSX: { cat: "churn", label: "Churn Exposure", driver: "Annual churn exposure" },
  COB: { cat: "churn", label: "Onboarding Loss", driver: "Annual churn exposure" },
  CC:  { cat: "churn", label: "Churn Exposure", driver: "Annual churn exposure" },
  // expansion
  UE:  { cat: "expansion", label: "Expansion Revenue Loss", driver: "Missed expansion revenue (est.)" },
  // visibility (entire VIS parent)
  // conversion (LFC + CONV core deal mechanics)
  SP:  { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  LC:  { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  SI:  { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  LQ:  { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  OM:  { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  CRM: { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  OPS: { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" },
  // CONV parent: conversion
  // POS parent: acquisition
  // AUTH parent: acquisition
};

function riskCategoryFor(code: string, parentCode: string): { cat: RiskCategory; label: string; driver: string } {
  const direct = RISK_CATEGORY_BY_CODE[code];
  if (direct) return direct;
  if (parentCode === "VIS") return { cat: "visibility", label: "Planning Exposure", driver: "Forecast/planning error exposure" };
  if (parentCode === "CONV") return { cat: "conversion", label: "Conversion Leakage", driver: "Close rate gap cost (quarterly)" };
  if (parentCode === "POS" || parentCode === "AUTH") return { cat: "acquisition", label: "Poor-Fit Customer Cost", driver: "Poor-fit customer cost (annual est.)" };
  return { cat: "conversion", label: "Revenue Leakage", driver: "Revenue exposure" };
}

export const getRevenueAtRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(
    async ({ data, context }): Promise<RevenueAtRisk | { error: "no_completed_assessment" }> => {
      const userId = context.userId;

      let assessmentId = data?.assessmentId;
      if (!assessmentId) {
        const { data: latest, error } = await supabaseAdmin
          .from("assessments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!latest) return { error: "no_completed_assessment" as const };
        assessmentId = latest.id;
      }

      const [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, profileRes, companyRes] =
        await Promise.all([
          supabaseAdmin
            .from("assessments")
            .select("id,user_id,submitted_at,selected_child_ids")
            .eq("id", assessmentId)
            .maybeSingle(),
          supabaseAdmin
            .from("assessment_scores")
            .select("child_system_id,health_score,tracking_score,visibility_gap,is_soft_shadow,severity")
            .eq("assessment_id", assessmentId)
            .eq("user_id", userId),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("parent_systems")
            .select("id,code,name,color_hex,sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("child_systems")
            .select("id,parent_system_id,code,name,sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("failure_map")
            .select("child_system_id,core_symptoms"),
          supabaseAdmin
            .from("profiles")
            .select("first_name,tier")
            .eq("user_id", userId)
            .maybeSingle(),
          supabaseAdmin
            .from("company_profiles")
            .select("annual_revenue,acv,cac,estimated_ltv,avg_close_rate,annual_churn")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

      for (const r of [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, profileRes, companyRes]) {
        if ((r as any).error) throw new Error((r as any).error.message);
      }
      if (!asmtRes.data) throw new Error("Assessment not found");
      if (asmtRes.data.user_id !== userId) throw new Error("Forbidden");

      const parents = (parentsRes.data ?? []) as any[];
      const children = (childrenRes.data ?? []) as any[];
      const scores = (scoresRes.data ?? []) as any[];
      const failures = (failureRes.data ?? []) as any[];

      const parentById = new Map<string, any>();
      for (const p of parents) parentById.set(p.id, p);
      const scoreByChild = new Map<string, any>();
      for (const s of scores) scoreByChild.set(s.child_system_id, s);
      const failureByChild = new Map<string, any>();
      for (const f of failures) failureByChild.set(f.child_system_id, f);

      const seed = assessmentId!;
      const items: RiskItemFull[] = [];
      for (const c of children) {
        const parent = parentById.get(c.parent_system_id);
        const s = scoreByChild.get(c.id);
        const assessed = !!s;
        let healthScore: number;
        let trackingScore: number;
        let visibilityGap: number;
        let isSoftShadow: boolean;
        if (assessed) {
          healthScore = Math.round(Number(s.health_score ?? 0));
          trackingScore = Math.round(Number(s.tracking_score ?? 0));
          visibilityGap = s.visibility_gap !== null ? Math.round(Number(s.visibility_gap)) : healthScore - trackingScore;
          isSoftShadow = !!s.is_soft_shadow;
        } else {
          const illus = illustrativeScore(seed, c.code);
          healthScore = illus.healthScore;
          trackingScore = illus.trackingScore;
          visibilityGap = healthScore - trackingScore;
          isSoftShadow = false;
        }

        // Risk filter: health<50 OR visibilityGap>25 OR isSoftShadow
        const flagged = healthScore < 50 || visibilityGap > 25 || isSoftShadow;
        if (!flagged) continue;

        const cat = riskCategoryFor(c.code, parent?.code ?? "");
        const f = failureByChild.get(c.id);
        items.push({
          childSystemId: c.id,
          code: c.code,
          name: c.name,
          parentCode: parent?.code ?? "",
          parentName: parent?.name ?? "",
          parentColorHex: parent?.color_hex ?? "#888880",
          healthScore,
          trackingScore,
          visibilityGap,
          isSoftShadow,
          severity:
            healthScore < 40 ? "critical" : healthScore < 60 ? "fragile" : healthScore < 75 ? "stable" : "strong",
          riskCategory: cat.cat,
          riskLabel: cat.label,
          financialDriverLabel: cat.driver,
          symptom: f?.core_symptoms ?? "",
          assessed,
        });
      }

      const tier = ((profileRes.data?.tier ?? "starter") as Tier);

      return {
        tier,
        firstName: profileRes.data?.first_name ?? null,
        assessment: { id: asmtRes.data.id, submitted_at: asmtRes.data.submitted_at },
        selectedChildIds: ((asmtRes.data as any).selected_child_ids ?? []) as string[],
        company: {
          annual_revenue: companyRes.data?.annual_revenue ?? null,
          acv: companyRes.data?.acv !== null && companyRes.data?.acv !== undefined ? Number(companyRes.data.acv) : null,
          cac: companyRes.data?.cac !== null && companyRes.data?.cac !== undefined ? Number(companyRes.data.cac) : null,
          estimated_ltv: companyRes.data?.estimated_ltv !== null && companyRes.data?.estimated_ltv !== undefined ? Number(companyRes.data.estimated_ltv) : null,
          avg_close_rate: companyRes.data?.avg_close_rate ?? null,
          annual_churn: companyRes.data?.annual_churn ?? null,
        },
        items,
      };
    },
  );

const metricsSchema = z.object({
  annual_revenue: z.string().min(1).max(40).optional(),
  acv: z.number().min(0).max(1e9).optional(),
  cac: z.number().min(0).max(1e9).optional(),
  avg_close_rate: z.string().min(1).max(40).optional(),
  annual_churn: z.string().min(1).max(40).optional(),
});

export const updateCompanyMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => metricsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const payload: Record<string, any> = { user_id: userId };
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== "" && v !== null) payload[k] = v;
    }
    const { error } = await supabaseAdmin
      .from("company_profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Matrix Map
// ---------------------------------------------------------------------------

export type MatrixParentNode = {
  id: string;
  code: string;
  name: string;
  colorHex: string;
  healthScore: number;
  trackingScore: number;
  severity: "critical" | "fragile" | "stable" | "strong";
  x: number;
  y: number;
};

export type MatrixConnection = {
  from: string;
  to: string;
  strength: number;
  label: string;
};

export type MatrixSysConnItem = {
  name: string;
  score: number | null;
  note: string;
  type: "strong" | "moderate" | "info";
};

export type MatrixChildNode = {
  id: string;
  code: string;
  name: string;
  healthScore: number;
  severity: "critical" | "fragile" | "stable" | "strong";
  assessed: boolean;
  coreSymptom: string;
  likelyRootCause: string;
};

export type MatrixChain = {
  label: string;
  parentCode: string;
  nodes: string[];
  note: string;
};

export type MatrixScenario = {
  childSystemId: string;
  code: string;
  name: string;
  parentCode: string;
  parentName: string;
  title: string;
  description: string;
  assessed: boolean;
  confidenceScore: number;
  leverage: "critical" | "high" | "moderate";
  improvements: { name: string; impact: "High" | "Medium"; reason: string }[];
  effortLevel: "Low" | "Medium" | "High";
  timeframe: string;
  stabilisationNote: string;
};

export type MatrixMapData = {
  tier: Tier;
  firstName: string | null;
  assessment: { id: string; submitted_at: string | null };
  selectedChildIds: string[];
  parents: MatrixParentNode[];
  summaryCounts: { critical: number; strained: number; needsAttention: number; healthy: number };
  connections: MatrixConnection[];
  systemConnections: Record<string, { upstream: MatrixSysConnItem[]; downstream: MatrixSysConnItem[] }>;
  childrenByParent: Record<string, MatrixChildNode[]>;
  criticalChains: MatrixChain[];
  scenarios: MatrixScenario[];
};

const PARENT_POSITIONS: Record<string, { x: number; y: number }> = {
  POS: { x: 200, y: 180 },
  AUTH: { x: 200, y: 360 },
  CONV: { x: 420, y: 270 },
  LFC: { x: 640, y: 180 },
  VIS: { x: 640, y: 360 },
};

export const getMatrixMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(
    async ({ data, context }): Promise<MatrixMapData | { error: "no_completed_assessment" }> => {
      const userId = context.userId;

      let assessmentId = data?.assessmentId;
      if (!assessmentId) {
        const { data: latest, error } = await supabaseAdmin
          .from("assessments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!latest) return { error: "no_completed_assessment" as const };
        assessmentId = latest.id;
      }

      const [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, pathsRes, profileRes] =
        await Promise.all([
          supabaseAdmin
            .from("assessments")
            .select("id,user_id,submitted_at,selected_child_ids")
            .eq("id", assessmentId)
            .maybeSingle(),
          supabaseAdmin
            .from("assessment_scores")
            .select("child_system_id,health_score,tracking_score")
            .eq("assessment_id", assessmentId)
            .eq("user_id", userId),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("parent_systems")
            .select("id,code,name,color_hex,sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("child_systems")
            .select("id,parent_system_id,code,name,sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("failure_map")
            .select(
              "child_system_id,core_symptoms,likely_root_causes,impacted_system_1,impact_reason_1,impacted_system_2,impact_reason_2,impacted_system_3,impact_reason_3",
            ),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("critical_paths")
            .select("name,tagline,definition,bottleneck_logic,sort_order")
            .order("sort_order")
            .limit(3),
          supabaseAdmin
            .from("profiles")
            .select("first_name,tier")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

      for (const r of [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, pathsRes, profileRes]) {
        if ((r as any).error) throw new Error((r as any).error.message);
      }
      if (!asmtRes.data) throw new Error("Assessment not found");
      if (asmtRes.data.user_id !== userId) throw new Error("Forbidden");

      const parentsRaw = (parentsRes.data ?? []) as any[];
      const childrenRaw = (childrenRes.data ?? []) as any[];
      const scores = (scoresRes.data ?? []) as any[];
      const failures = (failureRes.data ?? []) as any[];
      const paths = (pathsRes.data ?? []) as any[];

      const parentById = new Map<string, any>();
      for (const p of parentsRaw) parentById.set(p.id, p);
      const scoreByChild = new Map<string, any>();
      for (const s of scores) scoreByChild.set(s.child_system_id, s);
      const failureByChild = new Map<string, any>();
      for (const f of failures) failureByChild.set(f.child_system_id, f);

      const seed = assessmentId!;
      type ChildInfo = {
        id: string;
        code: string;
        name: string;
        parent: any;
        healthScore: number;
        trackingScore: number;
        assessed: boolean;
      };
      const childInfoById = new Map<string, ChildInfo>();
      const childInfoByName = new Map<string, ChildInfo>();
      for (const c of childrenRaw) {
        const s = scoreByChild.get(c.id);
        const assessed = !!s;
        const illus = illustrativeScore(seed, c.code);
        const healthScore = assessed ? Math.round(Number(s.health_score ?? 0)) : illus.healthScore;
        const trackingScore = assessed
          ? Math.round(Number(s.tracking_score ?? 0))
          : illus.trackingScore;
        const info: ChildInfo = {
          id: c.id,
          code: c.code,
          name: c.name,
          parent: parentById.get(c.parent_system_id),
          healthScore,
          trackingScore,
          assessed,
        };
        childInfoById.set(c.id, info);
        childInfoByName.set(c.name.trim().toLowerCase(), info);
      }

      const parentBuckets = new Map<string, { h: number[]; t: number[] }>();
      for (const info of childInfoById.values()) {
        if (!info.parent) continue;
        const b = parentBuckets.get(info.parent.code) ?? { h: [], t: [] };
        b.h.push(info.healthScore);
        b.t.push(info.trackingScore);
        parentBuckets.set(info.parent.code, b);
      }
      const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

      const parents: MatrixParentNode[] = parentsRaw
        .filter((p) => PARENT_POSITIONS[p.code])
        .map((p) => {
          const b = parentBuckets.get(p.code) ?? { h: [], t: [] };
          const healthScore = avg(b.h);
          const trackingScore = avg(b.t);
          return {
            id: p.id,
            code: p.code,
            name: p.name,
            colorHex: p.color_hex,
            healthScore,
            trackingScore,
            severity: severityFor(healthScore),
            x: PARENT_POSITIONS[p.code].x,
            y: PARENT_POSITIONS[p.code].y,
          };
        });

      const parentByCode = new Map<string, MatrixParentNode>();
      for (const p of parents) parentByCode.set(p.code, p);

      let critical = 0, strained = 0, needsAttention = 0, healthy = 0;
      for (const info of childInfoById.values()) {
        if (info.healthScore < 40) critical++;
        else if (info.healthScore < 60) strained++;
        else if (info.healthScore < 70) needsAttention++;
        else healthy++;
      }

      // Parent-to-parent connections
      const pairMap = new Map<string, { from: string; to: string; strength: number; label: string }>();
      for (const f of failures) {
        const sourceChild = childInfoById.get(f.child_system_id);
        if (!sourceChild?.parent) continue;
        const fromCode = sourceChild.parent.code;
        const impacts: { sys: string | null; reason: string | null }[] = [
          { sys: f.impacted_system_1, reason: f.impact_reason_1 },
          { sys: f.impacted_system_2, reason: f.impact_reason_2 },
          { sys: f.impacted_system_3, reason: f.impact_reason_3 },
        ];
        for (const im of impacts) {
          if (!im.sys) continue;
          const targetInfo = childInfoByName.get(String(im.sys).trim().toLowerCase());
          if (!targetInfo?.parent) continue;
          const toCode = targetInfo.parent.code;
          if (toCode === fromCode) continue;
          const key = `${fromCode}->${toCode}`;
          const ex = pairMap.get(key);
          if (ex) {
            ex.strength++;
          } else {
            pairMap.set(key, {
              from: fromCode,
              to: toCode,
              strength: 1,
              label: im.reason ?? `${fromCode} influences ${toCode}`,
            });
          }
        }
      }
      const connections: MatrixConnection[] = Array.from(pairMap.values()).sort(
        (a, b) => b.strength - a.strength,
      );

      const PARENT_CODES = ["POS", "AUTH", "CONV", "LFC", "VIS"];
      const systemConnections: Record<
        string,
        { upstream: MatrixSysConnItem[]; downstream: MatrixSysConnItem[] }
      > = {};
      for (const code of PARENT_CODES) {
        const downstream: MatrixSysConnItem[] = connections
          .filter((c) => c.from === code)
          .slice(0, 3)
          .map((c) => {
            const target = parentByCode.get(c.to);
            const score = target?.healthScore ?? null;
            const type: MatrixSysConnItem["type"] =
              c.strength >= 4 || (score !== null && score < 60) ? "strong" : "moderate";
            return { name: target?.name ?? c.to, score, note: c.label, type };
          });
        const upstream: MatrixSysConnItem[] = connections
          .filter((c) => c.to === code)
          .slice(0, 3)
          .map((c) => {
            const source = parentByCode.get(c.from);
            const score = source?.healthScore ?? null;
            const type: MatrixSysConnItem["type"] =
              c.strength >= 4 || (score !== null && score < 60) ? "strong" : "moderate";
            return { name: source?.name ?? c.from, score, note: c.label, type };
          });
        if (upstream.length === 0) {
          upstream.push({
            name: "No direct upstream dependencies",
            score: null,
            note: `${parentByCode.get(code)?.name ?? code} is a foundational system — it influences others but has no upstream revenue system feeding it.`,
            type: "info",
          });
        }
        systemConnections[code] = { upstream, downstream };
      }

      const childrenByParent: Record<string, MatrixChildNode[]> = {};
      for (const code of PARENT_CODES) {
        const arr: MatrixChildNode[] = [];
        for (const info of childInfoById.values()) {
          if (info.parent?.code !== code) continue;
          const f = failureByChild.get(info.id);
          arr.push({
            id: info.id,
            code: info.code,
            name: info.name,
            healthScore: info.healthScore,
            severity: severityFor(info.healthScore),
            assessed: info.assessed,
            coreSymptom: f?.core_symptoms ?? "",
            likelyRootCause: f?.likely_root_causes ?? "",
          });
        }
        arr.sort((a, b) => {
          if (a.assessed !== b.assessed) return a.assessed ? -1 : 1;
          return a.healthScore - b.healthScore;
        });
        childrenByParent[code] = arr;
      }

      const sortedByWeakness = Array.from(childInfoById.values())
        .filter((c) => c.assessed)
        .sort((a, b) => a.healthScore - b.healthScore);
      const seedsForChains =
        sortedByWeakness.length >= 3
          ? sortedByWeakness.slice(0, 3)
          : Array.from(childInfoById.values())
              .sort((a, b) => a.healthScore - b.healthScore)
              .slice(0, 3);

      function walkChain(startId: string, length = 4): string[] {
        const out: string[] = [];
        const seenSet = new Set<string>();
        let cursorId: string | null = startId;
        for (let i = 0; i < length && cursorId; i++) {
          const info = childInfoById.get(cursorId);
          if (!info || seenSet.has(cursorId)) break;
          seenSet.add(cursorId);
          out.push(info.name);
          const f = failureByChild.get(cursorId);
          if (!f) break;
          const nextName: string | null =
            f.impacted_system_1 ?? f.impacted_system_2 ?? f.impacted_system_3 ?? null;
          if (!nextName) break;
          const next = childInfoByName.get(String(nextName).trim().toLowerCase());
          cursorId = next?.id ?? null;
        }
        return out;
      }

      const fallbackLabels = ["Primary breakdown chain", "Compounding pressure", "Visibility gap chain"];
      const fallbackNotes = [
        "The primary breakdown begins here. Every downstream system is degraded as a direct consequence.",
        "Weakness in this subsystem compounds across the funnel — each downstream stage absorbs the problem.",
        "Fragility here cascades into all downstream visibility and planning capabilities.",
      ];
      const criticalChains: MatrixChain[] = seedsForChains.map((s, i) => {
        const nodes = walkChain(s.id, 4);
        const pathRow = paths[i];
        return {
          label: pathRow?.name ?? fallbackLabels[i] ?? `Chain ${i + 1}`,
          parentCode: s.parent?.code ?? "POS",
          nodes: nodes.length ? nodes : [s.name],
          note: pathRow?.bottleneck_logic ?? fallbackNotes[i] ?? "",
        };
      });

      const scenarios: MatrixScenario[] = [];
      for (const info of childInfoById.values()) {
        const f = failureByChild.get(info.id);
        if (!f) continue;
        const impacts = [
          { sys: f.impacted_system_1, reason: f.impact_reason_1 },
          { sys: f.impacted_system_2, reason: f.impact_reason_2 },
          { sys: f.impacted_system_3, reason: f.impact_reason_3 },
        ].filter((x) => x.sys && x.reason);
        const improvements = impacts.map((x, idx) => {
          const target = childInfoByName.get(String(x.sys).trim().toLowerCase());
          const targetWeak = target ? target.healthScore < 60 : false;
          return {
            name: String(x.sys),
            impact: (idx === 0 || targetWeak ? "High" : "Medium") as "High" | "Medium",
            reason: String(x.reason),
          };
        });
        const weakCascadeCount = improvements.filter((i) => {
          const t = childInfoByName.get(i.name.trim().toLowerCase());
          return t !== undefined && t.healthScore < 60;
        }).length;
        const base = 100 - info.healthScore;
        const confidenceScore = Math.round(Math.min(95, base * (1 + 0.15 * weakCascadeCount)));
        const leverage: MatrixScenario["leverage"] =
          confidenceScore >= 80 ? "critical" : confidenceScore >= 60 ? "high" : "moderate";
        const effortLevel: MatrixScenario["effortLevel"] =
          info.healthScore < 40 ? "High" : info.healthScore < 60 ? "Medium" : "Low";
        const timeframe =
          effortLevel === "High" ? "90–180 days" : effortLevel === "Medium" ? "60–120 days" : "30–60 days";
        const stabilisationNote = `Allow ${timeframe} before expecting improvements to show in metrics.`;
        const sym = f.core_symptoms ? String(f.core_symptoms) : "";
        const description = sym
          ? `Address the underlying pattern: ${sym.charAt(0).toLowerCase()}${sym.slice(1)}`
          : `Strengthen ${info.name} to compound gains across dependent systems.`;
        scenarios.push({
          childSystemId: info.id,
          code: info.code,
          name: info.name,
          parentCode: info.parent?.code ?? "",
          parentName: info.parent?.name ?? "",
          title: `Improve ${info.name}`,
          description,
          assessed: info.assessed,
          confidenceScore,
          leverage,
          improvements,
          effortLevel,
          timeframe,
          stabilisationNote,
        });
      }
      scenarios.sort((a, b) => b.confidenceScore - a.confidenceScore);

      const tier = ((profileRes.data?.tier ?? "starter") as Tier);

      return {
        tier,
        firstName: profileRes.data?.first_name ?? null,
        assessment: { id: asmtRes.data.id, submitted_at: asmtRes.data.submitted_at },
        selectedChildIds: ((asmtRes.data as any).selected_child_ids ?? []) as string[],
        parents,
        summaryCounts: { critical, strained, needsAttention, healthy },
        connections,
        systemConnections,
        childrenByParent,
        criticalChains,
        scenarios,
      };
    },
  );
