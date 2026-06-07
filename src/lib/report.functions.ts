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
