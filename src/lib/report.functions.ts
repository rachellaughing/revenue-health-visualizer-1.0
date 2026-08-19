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
  severity: "critical" | "fragile" | "stable" | "strong" | "not_assessed";
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
  /** true when the copy is deterministic fallback text, not AI-generated */
  isFallback?: boolean;
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
      const assessedCount = b?.health.length ?? 0;
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
        severity: assessedCount === 0 ? "not_assessed" : severityFor(healthScore),
        isSoftShadow: (b?.soft ?? 0) > 0,
        isHardShadow: (b?.hard ?? 0) > 0,
        assessed: assessedCount,
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
      // The prompt asks for a headline, body, 3 risks and 5 system paragraphs.
      // 800 tokens truncated the response mid-JSON on every real assessment,
      // which made JSON.parse fail and silently skipped the DB write.
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[narrative] anthropic error", response.status, errText);
    throw new Error(`Anthropic API error ${response.status}`);
  }

  const json = (await response.json()) as any;

  if (json?.stop_reason === "max_tokens") {
    console.error("[narrative] response truncated by max_tokens", json?.usage);
    throw new Error("Narrative response was truncated (max_tokens)");
  }

  const text: string = json?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Anthropic");


  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    console.error("[narrative] failed to parse JSON:", text);
    throw new Error("Narrative response was not valid JSON");
  }

  const validation = narrativeJsonSchema.safeParse(parsed);
  if (!validation.success) {
    console.error("[narrative] schema validation failed:", validation.error.message);
    throw new Error("Narrative response did not match the expected shape");
  }
  const validated = validation.data;

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

/**
 * Deterministic narrative derived purely from the scores already on the page.
 * Used whenever the AI generation fails so the report never shows an
 * indefinite loading state.
 */
function buildFallbackNarrative(
  companyName: string,
  overallScore: number,
  systems: ParentScore[],
): NonNullable<Narrative> {
  const assessed = systems.filter((s) => s.assessed > 0);
  const band =
    overallScore >= 75
      ? "strong"
      : overallScore >= 60
        ? "stable"
        : overallScore >= 40
          ? "fragile"
          : "critical";
  const ranked = [...assessed].sort((a, b) => a.healthScore - b.healthScore);
  const weakest = ranked[0];
  const strongest = ranked[ranked.length - 1];

  const headline = weakest
    ? `${weakest.name} is the weakest link at ${weakest.healthScore}`
    : `Revenue health is ${band} at ${overallScore}/100`;

  const body = assessed.length
    ? `${companyName} scores ${overallScore}/100 overall, which reads as ${band}. ${weakest.name} is the lowest-scoring system at ${weakest.healthScore}${strongest && strongest.id !== weakest.id ? `, while ${strongest.name} is strongest at ${strongest.healthScore}` : ""}. ${
        assessed.filter((s) => s.isHardShadow || s.isSoftShadow).length
          ? `Shadow-system signals were detected in ${assessed.filter((s) => s.isHardShadow || s.isSoftShadow).map((s) => s.name).join(", ")}, meaning work is happening without the tracking to see it.`
          : `Tracking coverage averages ${Math.round(assessed.reduce((a, b) => a + b.trackingScore, 0) / assessed.length)}, which shapes how much of this picture is visible day to day.`
      }`
    : `${companyName} does not yet have enough completed Health Check data to summarise. Complete a Health Check to see a full picture.`;

  const risks: RiskItem[] = ranked.slice(0, 3).map((s, i) => ({
    rank: i + 1,
    system: s.name,
    text: `${s.name} scores ${s.healthScore} with tracking at ${s.trackingScore}${
      s.isHardShadow
        ? ", and is flagged as a hard shadow system — activity is running without reliable measurement."
        : s.isSoftShadow
          ? ", and is flagged as a soft shadow system — measurement is thin relative to activity."
          : "."
    } A visibility gap of ${s.visibilityGap} means decisions here rest on incomplete signal.`,
  }));

  return { headline, body, risks, isFallback: true };
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
  severity: "critical" | "fragile" | "stable" | "strong" | "not_assessed";
  isSoftShadow: boolean;
  isHardShadow: boolean;
  assessed: boolean;
};

export type SystemHealthSystem = ParentScore & {
  children: ChildSystemScore[];
  narrative: string | null;
};

export type ShadowThreshold = { healthGte: number; trackingLt: number };

export type RevenueSystemHealth = {
  tier: Tier;
  firstName: string | null;
  assessment: {
    id: string;
    submitted_at: string | null;
    selected_child_ids: string[] | null;
  };
  systems: SystemHealthSystem[];
  keyFinding: {
    headline: string;
    body: string;
    source: "cached" | "fallback";
  } | null;
  shadowThresholds: { soft: ShadowThreshold; hard: ShadowThreshold };
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

      // Real shadow thresholds live in revhealth2.scoring_config so the UI can
      // explain the classification without hardcoding numbers.
      const { data: shadowCfgRows } = await (supabaseAdmin as any)
        .schema("revhealth2")
        .from("scoring_config")
        .select("config_key,config_value")
        .in("config_key", ["shadow.soft", "shadow.hard"]);
      const shadowCfg = new Map<string, any>(
        (shadowCfgRows ?? []).map((r: any) => [r.config_key, r.config_value]),
      );
      const softCfg = shadowCfg.get("shadow.soft") ?? {};
      const hardCfg = shadowCfg.get("shadow.hard") ?? {};
      const shadowThresholds = {
        soft: {
          healthGte: Number(softCfg.health_gte ?? 60),
          trackingLt: Number(softCfg.tracking_lt ?? 40),
        },
        hard: {
          healthGte: Number(hardCfg.health_gte ?? 60),
          trackingLt: Number(hardCfg.tracking_lt ?? 20),
        },
      };

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
          const assessed = !!s;
          const health = assessed ? Number(s.health_score ?? 0) : 0;
          const tracking = assessed ? Number(s.tracking_score ?? 0) : 0;
          const visibilityGap =
            assessed && s.visibility_gap !== null ? Number(s.visibility_gap) : health - tracking;
          return {
            id: c.id,
            parentCode: p.code,
            code: c.code,
            name: c.name,
            healthScore: Math.round(health),
            trackingScore: Math.round(tracking),
            visibilityGap: Math.round(visibilityGap),
            severity: assessed ? severityFor(health) : "not_assessed",
            isSoftShadow: assessed && !!s.is_soft_shadow,
            isHardShadow: assessed && !!s.is_hard_shadow,
            assessed,
          };
        });

        const key = `narrative_${p.code.toLowerCase()}`;
        const narrative: string | null = narr ? (narr[key] ?? null) : null;

        return { ...p, children: kids, narrative };
      });

      const tier = (core.profile?.tier ?? "starter") as Tier;

      // Key finding: reuse the cached executive narrative; never generate.
      let keyFinding: RevenueSystemHealth["keyFinding"] = null;
      if (narr?.exec_headline && narr?.exec_body) {
        keyFinding = {
          headline: narr.exec_headline as string,
          body: narr.exec_body as string,
          source: "cached",
        };
      } else {
        const assessedParents = parentAgg
          .filter((p) => p.assessed > 0)
          .sort((a, b) => b.healthScore - a.healthScore);
        if (assessedParents.length) {
          const strongest = assessedParents[0]!;
          const weakest = assessedParents[assessedParents.length - 1]!;
          const allChildren = systems.flatMap((s) => s.children);
          const criticalCount = allChildren.filter((c) => c.severity === "critical").length;
          const shadowCount = allChildren.filter(
            (c) => c.isSoftShadow || c.isHardShadow,
          ).length;
          const countClause =
            criticalCount > 0 || shadowCount > 0
              ? `, with ${criticalCount} systems critical and ${shadowCount} systems showing unconfirmed strength`
              : "";
          keyFinding = {
            headline: `${strongest.name} is your strongest system. ${weakest.name} needs the most attention.`,
            body: `${weakest.name} is the clear constraint at ${Math.round(weakest.healthScore)}${countClause}.`,
            source: "fallback",
          };
        }
      }

      return {
        tier,
        firstName: core.profile?.first_name ?? null,
        assessment: {
          id: core.assessment.id,
          submitted_at: core.assessment.submitted_at,
          selected_child_ids: (core.assessment as any).selected_child_ids ?? null,
        },
        systems,
        keyFinding,
        shadowThresholds,
      };

    },
  );

// ---------------------------------------------------------------------------
// Top Opportunities
// ---------------------------------------------------------------------------

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


export type SeverityBand = "critical" | "fragile" | "stable" | "strong";

/** Which badge a featured card shows. Wording lives client-side in
 *  src/components/reports/opportunity-labels.ts */
export type BadgeKey = "widest_impact" | "high_impact" | "quick_win";

export type FeaturedCard = {
  childSystemId: string;
  code: string;
  name: string;
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  badgeKey: BadgeKey;
  /** "What are we seeing?" — plain language */
  whatWeSee: string;
  /** "Why does it matter?" */
  whyItMatters: string;
  /** "What else is it affecting?" — impacted system names */
  affecting: string[];
  /** Context only. Never affects ranking or selection. */
  criticalPath: string | null;
  /** "What could you do next?" — 2-3 concrete actions */
  startHere: string[];
};

export type OtherOpportunityItem = {
  childSystemId: string;
  code: string;
  name: string;
  severity: SeverityBand;
};

export type OtherOpportunityGroup = {
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  items: OtherOpportunityItem[];
};

export type LockedSystem = {
  childSystemId: string;
  code: string;
  name: string;
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  /** child_systems.customer_facing_description */
  governs: string;
};

export type LockedParentTile = {
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  count: number;
};

export type TopOpportunities = {
  tier: Tier;
  firstName: string | null;
  assessment: { id: string; submitted_at: string | null };
  evaluatedCount: number;
  totalCount: number;
  biggestImpact: FeaturedCard[];
  quickestWins: FeaturedCard[];
  otherGroups: OtherOpportunityGroup[];
  /** Starter tier only — never scored, never ranked. */
  lockedSystems: LockedSystem[];
  lockedTiles: LockedParentTile[];
};

const MAX_FEATURED = 6;
/** A system must be at least this weak to be a "real" gap. */
const WEAK_THRESHOLD = 60;
const QUICK_WIN_GAP_THRESHOLD = 75;
/** Documented framework influence required to qualify as Biggest Impact (1-5 scales). */
const MIN_INFLUENCE = 3;
const MIN_MAGNITUDE = 3;

const HORIZON_ORDER: Record<string, number> = {
  Immediate: 0,
  "Short-Term": 1,
  "Medium-Term": 2,
  "Long-Term": 3,
};

function severityBand(health: number): SeverityBand {
  return health < 40
    ? "critical"
    : health < 60
      ? "fragile"
      : health < 75
        ? "stable"
        : "strong";
}

// --- AI card copy (same pattern as report_narratives) -----------------------

const opportunityCopySchema = z.object({
  cards: z.array(
    z.object({
      code: z.string().min(1),
      what_we_see: z.string().min(1).max(400),
      why_it_matters: z.string().min(1).max(900),
      start_here: z.array(z.string().min(1).max(240)).min(2).max(3),
    }),
  ),
});

type CardCopy = { whatWeSee: string; whyItMatters: string; startHere: string[] };

type CopyInput = {
  code: string;
  name: string;
  parentName: string;
  healthScore: number;
  coreSymptom: string;
  likelyRootCause: string;
  impacts: string[];
  quickWin: boolean;
};

function buildOpportunityCopyPrompt(companyName: string, items: CopyInput[]): string {
  const blocks = items
    .map(
      (i) => `---
CODE: ${i.code}
System: ${i.name} (${i.parentName})
Health score: ${i.healthScore}/100
Framing: ${i.quickWin ? "a practical improvement that can begin without a large rebuild" : "a weakness with wide knock-on effect"}
Documented symptoms: ${i.coreSymptom || "none recorded"}
Documented likely root causes: ${i.likelyRootCause || "none recorded"}
Other systems it affects: ${i.impacts.length ? i.impacts.join(", ") : "none recorded"}`,
    )
    .join("\n");

  return `You are writing the opportunity cards for a Revenue Health report for ${companyName}.
Use ONLY the data provided below. Do not invent facts. Be direct and specific. No generic filler,
no framework jargon, no consulting cliches. Write so a founder could bring it to a meeting without
translating it first.

Never describe anything as "low effort", "easy", "quick to implement" or imply an effort/complexity
estimate — we do not measure effort.

For EACH system below, write:
- what_we_see: ONE plain-language sentence describing the observable symptom.
- why_it_matters: ONE short paragraph (2-3 sentences) on the business consequence, grounded in the root causes.
- start_here: 2-3 concrete, specific, discussable actions. Each one short and imperative
  (e.g. "Agree on the five warning signs leadership needs to see every week."). Not abstract advice.

Systems:
${blocks}

Respond with JSON only, no prose or code fences:
{"cards":[{"code":"...","what_we_see":"...","why_it_matters":"...","start_here":["...","..."]}]}`;
}

async function generateOpportunityCopy(
  assessmentId: string,
  userId: string,
  companyName: string,
  items: CopyInput[],
): Promise<Map<string, CardCopy>> {
  const out = new Map<string, CardCopy>();
  if (items.length === 0) return out;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[opportunity-copy] ANTHROPIC_API_KEY is not configured");
    return out;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        messages: [
          { role: "user", content: buildOpportunityCopyPrompt(companyName, items) },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[opportunity-copy] anthropic error", response.status, await response.text());
      return out;
    }

    const json = (await response.json()) as any;
    const text: string = json?.content?.[0]?.text ?? "";
    if (!text) return out;

    const validated = opportunityCopySchema.parse(JSON.parse(stripCodeFences(text)));

    const knownCodes = new Set(items.map((i) => i.code));
    for (const c of validated.cards) {
      if (!knownCodes.has(c.code)) continue;
      out.set(c.code, {
        whatWeSee: c.what_we_see,
        whyItMatters: c.why_it_matters,
        startHere: c.start_here,
      });
    }
    return out;
  } catch (e) {
    console.error("[opportunity-copy] generation failed:", (e as Error).message);
    return out;
  }
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

      const [
        asmtRes,
        scoresRes,
        parentsRes,
        childrenRes,
        failureRes,
        profileRes,
        companyRes,
        pathsRes,
        pathMembersRes,
        cachedRes,
      ] = await Promise.all([
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
          .select(
            "id,parent_system_id,code,name,sort_order,opportunity_class,impact_horizon,influence_score,impact_magnitude,customer_facing_description",
          ),
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
        supabaseAdmin
          .from("company_profiles")
          .select("company_name")
          .eq("user_id", userId)
          .maybeSingle(),
        (supabaseAdmin as any).schema("revhealth2").from("critical_paths").select("id,name"),
        (supabaseAdmin as any)
          .schema("revhealth2")
          .from("critical_path_members")
          .select("critical_path_id,child_system_id,sort_order"),
        supabaseAdmin
          .from("opportunity_actions")
          .select("child_system_id,what_we_see,why_it_matters,start_here")
          .eq("assessment_id", assessmentId)
          .eq("user_id", userId),
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

      const pathNameById = new Map<string, string>();
      for (const p of ((pathsRes as any)?.data ?? []) as any[]) pathNameById.set(p.id, p.name);
      const pathByChild = new Map<string, string>();
      for (const m of ((pathMembersRes as any)?.data ?? []) as any[]) {
        const nm = pathNameById.get(m.critical_path_id);
        if (nm && !pathByChild.has(m.child_system_id)) pathByChild.set(m.child_system_id, nm);
      }

      const tier = (profileRes.data?.tier ?? "starter") as Tier;
      const isStarter = tier === "starter";
      const selectedChildIds = ((asmtRes.data as any).selected_child_ids ?? []) as string[];
      const selectedSet = new Set(selectedChildIds);

      // ---- Build evaluated pool (assessed only; Starter restricted to selection)
      type Row = {
        child: any;
        parent: any;
        healthScore: number;
        severity: SeverityBand;
        opportunityScore: number;
        weakCascadeCount: number;
        impacts: string[];
        coreSymptom: string;
        likelyRootCause: string;
      };

      const healthByChildId = new Map<string, number>();
      const healthByName = new Map<string, number>();
      for (const c of children) {
        const s = scoreByChild.get(c.id);
        if (!s) continue;
        const h = Math.round(Number(s.health_score ?? 0));
        healthByChildId.set(c.id, h);
        healthByName.set(String(c.name).trim().toLowerCase(), h);
      }

      const evaluated: Row[] = [];
      for (const c of children) {
        const assessed = scoreByChild.has(c.id) && (!isStarter || selectedSet.has(c.id));
        if (!assessed) continue;
        const healthScore = healthByChildId.get(c.id) ?? 0;
        const f = failureByChild.get(c.id);
        const impacts = [f?.impacted_system_1, f?.impacted_system_2, f?.impacted_system_3]
          .filter(Boolean)
          .map((x: any) => String(x));

        // UNCHANGED ranking formula
        const weakCascadeCount = impacts.filter((nm) => {
          const h = healthByName.get(nm.trim().toLowerCase());
          return h !== undefined && h < WEAK_THRESHOLD;
        }).length;
        const baseScore = 100 - healthScore;
        const opportunityScore = Math.round(baseScore * (1 + 0.15 * weakCascadeCount));

        evaluated.push({
          child: c,
          parent: parentById.get(c.parent_system_id),
          healthScore,
          severity: severityBand(healthScore),
          opportunityScore,
          weakCascadeCount,
          impacts,
          coreSymptom: f?.core_symptoms ?? "",
          likelyRootCause: f?.likely_root_causes ?? "",
        });
      }

      // ---- Biggest Impact: no backfill
      const biggestRows = evaluated
        .filter(
          (r) =>
            r.healthScore < WEAK_THRESHOLD &&
            r.weakCascadeCount >= 1 &&
            Number(r.child.influence_score ?? 0) >= MIN_INFLUENCE &&
            Number(r.child.impact_magnitude ?? 0) >= MIN_MAGNITUDE,
        )
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, MAX_FEATURED);

      const biggestIds = new Set(biggestRows.map((r) => r.child.id));

      // ---- Quickest Wins: no backfill
      const quickRows = evaluated
        .filter(
          (r) =>
            r.child.opportunity_class === "Quick Win" &&
            r.healthScore < QUICK_WIN_GAP_THRESHOLD &&
            !biggestIds.has(r.child.id),
        )
        .sort((a, b) => {
          const ha = HORIZON_ORDER[a.child.impact_horizon ?? ""] ?? 9;
          const hb = HORIZON_ORDER[b.child.impact_horizon ?? ""] ?? 9;
          if (ha !== hb) return ha - hb;
          return b.opportunityScore - a.opportunityScore;
        })
        .slice(0, MAX_FEATURED);

      const featured = [...biggestRows, ...quickRows];
      const featuredIds = new Set(featured.map((r) => r.child.id));

      // ---- AI copy: cached per (assessment, child); generate only what's missing
      const copyByCode = new Map<string, CardCopy>();
      const codeById = new Map<string, string>(children.map((c) => [c.id, c.code]));
      for (const row of ((cachedRes as any)?.data ?? []) as any[]) {
        const code = codeById.get(row.child_system_id);
        if (!code) continue;
        copyByCode.set(code, {
          whatWeSee: row.what_we_see,
          whyItMatters: row.why_it_matters,
          startHere: Array.isArray(row.start_here) ? (row.start_here as string[]) : [],
        });
      }

      const missing = featured.filter((r) => !copyByCode.has(r.child.code));
      if (missing.length > 0) {
        const generated = await generateOpportunityCopy(
          assessmentId!,
          userId,
          companyRes?.data?.company_name ?? "this company",
          missing.map((r) => ({
            code: r.child.code,
            name: r.child.name,
            parentName: r.parent?.name ?? "",
            healthScore: r.healthScore,
            coreSymptom: r.coreSymptom,
            likelyRootCause: r.likelyRootCause,
            impacts: r.impacts,
            quickWin: !biggestIds.has(r.child.id),
          })),
        );
        if (generated.size > 0) {
          const rows = missing
            .filter((r) => generated.has(r.child.code))
            .map((r) => {
              const c = generated.get(r.child.code)!;
              copyByCode.set(r.child.code, c);
              return {
                assessment_id: assessmentId!,
                user_id: userId,
                child_system_id: r.child.id,
                what_we_see: c.whatWeSee,
                why_it_matters: c.whyItMatters,
                start_here: c.startHere,
                model_used: "claude-sonnet-4-5-20250929",
                generated_at: new Date().toISOString(),
              };
            });
          const { error: upErr } = await supabaseAdmin
            .from("opportunity_actions")
            .upsert(rows, { onConflict: "assessment_id,child_system_id" });
          if (upErr) console.error("[opportunity-copy] upsert failed:", upErr.message);
        }
      }

      const toCard = (r: Row, badgeKey: BadgeKey): FeaturedCard => {
        const copy = copyByCode.get(r.child.code);
        return {
          childSystemId: r.child.id,
          code: r.child.code,
          name: r.child.name,
          parentCode: r.parent?.code ?? "",
          parentName: r.parent?.name ?? "",
          parentColorHex: r.parent?.color_hex ?? "#888880",
          badgeKey,
          whatWeSee: copy?.whatWeSee ?? r.coreSymptom,
          whyItMatters: copy?.whyItMatters ?? r.likelyRootCause,
          affecting: r.impacts,
          criticalPath: pathByChild.get(r.child.id) ?? null,
          startHere: copy?.startHere ?? [],
        };
      };

      const biggestImpact = biggestRows.map((r, i) =>
        toCard(r, i === 0 ? "widest_impact" : "high_impact"),
      );
      const quickestWins = quickRows.map((r) => toCard(r, "quick_win"));

      // ---- Other opportunities: remaining evaluated systems, grouped by parent
      const groupMap = new Map<string, OtherOpportunityGroup>();
      for (const p of [...parents].sort((a, b) => a.sort_order - b.sort_order)) {
        groupMap.set(p.id, {
          parentCode: p.code,
          parentName: p.name,
          parentColorHex: p.color_hex ?? "#888880",
          items: [],
        });
      }
      for (const r of evaluated) {
        if (featuredIds.has(r.child.id)) continue;
        const g = groupMap.get(r.child.parent_system_id);
        if (!g) continue;
        g.items.push({
          childSystemId: r.child.id,
          code: r.child.code,
          name: r.child.name,
          severity: r.severity,
        });
      }
      const otherGroups = [...groupMap.values()].filter((g) => g.items.length > 0);
      for (const g of otherGroups) {
        g.items.sort((a, b) => a.name.localeCompare(b.name));
      }

      // ---- Locked systems (Starter only): never scored, never ranked
      const lockedSystems: LockedSystem[] = [];
      const lockedCounts = new Map<string, number>();
      if (isStarter) {
        for (const c of [...children].sort((a, b) => a.sort_order - b.sort_order)) {
          if (selectedSet.has(c.id)) continue;
          const p = parentById.get(c.parent_system_id);
          lockedSystems.push({
            childSystemId: c.id,
            code: c.code,
            name: c.name,
            parentCode: p?.code ?? "",
            parentName: p?.name ?? "",
            parentColorHex: p?.color_hex ?? "#888880",
            governs: c.customer_facing_description ?? "",
          });
          lockedCounts.set(c.parent_system_id, (lockedCounts.get(c.parent_system_id) ?? 0) + 1);
        }
      }
      const lockedTiles: LockedParentTile[] = isStarter
        ? [...parents]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((p) => ({
              parentCode: p.code,
              parentName: p.name,
              parentColorHex: p.color_hex ?? "#888880",
              count: lockedCounts.get(p.id) ?? 0,
            }))
        : [];

      return {
        tier,
        firstName: profileRes.data?.first_name ?? null,
        assessment: {
          id: asmtRes.data.id,
          submitted_at: asmtRes.data.submitted_at,
        },
        evaluatedCount: evaluated.length,
        totalCount: children.length,
        biggestImpact,
        quickestWins,
        otherGroups,
        lockedSystems,
        lockedTiles,
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
  severity: "critical" | "fragile" | "stable" | "strong" | "not_assessed";
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
        if (!assessed) continue; // Exclude unassessed from Revenue at Risk
        let healthScore: number;
        let trackingScore: number;
        let visibilityGap: number;
        let isSoftShadow: boolean;
        healthScore = Math.round(Number(s.health_score ?? 0));
        trackingScore = Math.round(Number(s.tracking_score ?? 0));
        visibilityGap = s.visibility_gap !== null ? Math.round(Number(s.visibility_gap)) : healthScore - trackingScore;
        isSoftShadow = !!s.is_soft_shadow;

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
          severity: !assessed
            ? "not_assessed"
            : healthScore < 40 ? "critical" : healthScore < 60 ? "fragile" : healthScore < 75 ? "stable" : "strong",
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
  severity: "critical" | "fragile" | "stable" | "strong" | "not_assessed";
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
  trackingScore: number;
  isSoftShadow: boolean;
  isHardShadow: boolean;
  severity: "critical" | "fragile" | "stable" | "strong" | "not_assessed";
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

/** Direction of a resolved relationship between the selected level and an external parent system. */
export type RelationDirection = "upstream" | "downstream" | "mutual";

export type SystemRelationship = {
  parentCode: string;
  parentName: string;
  parentColorHex: string;
  direction: RelationDirection;
  /** Child systems in the external parent that feed INTO the selected level. */
  viaUpstream: string[];
  /** Child systems in the external parent that the selected level feeds. */
  viaDownstream: string[];
};

// --- revhealth2.dependency_map resolver ------------------------------------
// Both dependency columns are pipe-delimited free text naming other child
// systems. There is no canonical id for the targets, so resolution goes
// through normalised name text — the same limitation failure_map's cascade
// fields already have.
//
// Unresolved values are returned rather than dropped: some entries are real
// business outcomes (e.g. "Executive Decision Making") rather than revenue
// systems, and a future "Business outcomes influenced" section can read them
// straight off this shape. They are never rendered as revenue systems and
// never throw.
export function splitDependencyField(raw: unknown): string[] {
  return String(raw ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveDependencyTargets<T>(
  raw: unknown,
  byNormalisedName: Map<string, T>,
): { resolved: T[]; unresolved: string[] } {
  const resolved: T[] = [];
  const unresolved: string[] = [];
  for (const value of splitDependencyField(raw)) {
    const hit = byNormalisedName.get(value.toLowerCase());
    if (hit) resolved.push(hit);
    else unresolved.push(value);
  }
  return { resolved, unresolved };
}


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
  /** Keyed by child system id. Child-level "Mutual" = this one child has resolved
   *  relationships with that parent in BOTH directions. */
  childRelationships: Record<string, SystemRelationship[]>;
  /** Keyed by parent code. Parent-level "Mutual" = at least one relationship each
   *  way, even via different child-system pairs. */
  parentRelationships: Record<string, SystemRelationship[]>;
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

      const [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, pathsRes, pathMembersRes, profileRes, depsRes] =
        await Promise.all([
          supabaseAdmin
            .from("assessments")
            .select("id,user_id,submitted_at,selected_child_ids")
            .eq("id", assessmentId)
            .maybeSingle(),
          supabaseAdmin
            .from("assessment_scores")
            .select("child_system_id,health_score,tracking_score,is_soft_shadow,is_hard_shadow")
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
            .select("id,name,tagline,definition,bottleneck_logic,sort_order")
            .order("sort_order"),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("critical_path_members")
            .select("critical_path_id,child_system_id,sort_order")
            .order("sort_order"),
          supabaseAdmin
            .from("profiles")
            .select("first_name,tier")
            .eq("user_id", userId)
            .maybeSingle(),
          (supabaseAdmin as any)
            .schema("revhealth2")
            .from("dependency_map")
            .select("child_system_id,direct_dependencies,downstream_systems_influenced"),
        ]);

      for (const r of [asmtRes, scoresRes, parentsRes, childrenRes, failureRes, pathsRes, pathMembersRes, profileRes]) {
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
        isSoftShadow: boolean;
        isHardShadow: boolean;
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
          isSoftShadow: assessed ? !!s.is_soft_shadow : false,
          isHardShadow: assessed ? !!s.is_hard_shadow : false,
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
            trackingScore: info.trackingScore,
            isSoftShadow: info.isSoftShadow,
            isHardShadow: info.isHardShadow,
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

      // ---- Cross-system relationships from revhealth2.dependency_map ------
      // Two intentionally different definitions of "Mutual", one per level.
      const depsRaw = ((depsRes as any)?.data ?? []) as any[];
      const unresolvedAll: string[] = [];

      type Edge = { source: ChildInfo; target: ChildInfo; dir: "up" | "down" };
      const edgesByChild = new Map<string, Edge[]>();

      for (const row of depsRaw) {
        const source = childInfoById.get(row.child_system_id);
        if (!source) continue;
        const up = resolveDependencyTargets(row.direct_dependencies, childInfoByName);
        const down = resolveDependencyTargets(row.downstream_systems_influenced, childInfoByName);
        unresolvedAll.push(...up.unresolved, ...down.unresolved);
        const edges: Edge[] = [
          ...up.resolved.map((target) => ({ source, target, dir: "up" as const })),
          ...down.resolved.map((target) => ({ source, target, dir: "down" as const })),
        ];
        edgesByChild.set(source.id, edges);
      }

      if (unresolvedAll.length > 0) {
        // Dev-only diagnostic. Some entries are deliberate business outcomes
        // (e.g. "Executive Decision Making"), not naming mismatches — they are
        // skipped, never rendered, never thrown.
        console.warn(
          "[matrix-map] dependency_map values not resolved to a child system:",
          Array.from(new Set(unresolvedAll)).join(", "),
        );
      }

      const parentMetaByCode = new Map<string, { name: string; color: string }>();
      for (const p of parentsRaw) {
        parentMetaByCode.set(p.code, { name: p.name, color: p.color_hex ?? "#888880" });
      }

      function buildRelationships(
        edges: Edge[],
        ownParentCode: string,
      ): SystemRelationship[] {
        const acc = new Map<string, { up: Set<string>; down: Set<string> }>();
        for (const e of edges) {
          const code = e.target.parent?.code;
          if (!code || code === ownParentCode) continue;
          const entry = acc.get(code) ?? { up: new Set<string>(), down: new Set<string>() };
          (e.dir === "up" ? entry.up : entry.down).add(e.target.name);
          acc.set(code, entry);
        }
        const out: SystemRelationship[] = [];
        for (const [code, entry] of acc) {
          const meta = parentMetaByCode.get(code);
          const direction: RelationDirection =
            entry.up.size > 0 && entry.down.size > 0
              ? "mutual"
              : entry.up.size > 0
                ? "upstream"
                : "downstream";
          out.push({
            parentCode: code,
            parentName: meta?.name ?? code,
            parentColorHex: meta?.color ?? "#888880",
            direction,
            viaUpstream: [...entry.up].sort(),
            viaDownstream: [...entry.down].sort(),
          });
        }
        return out.sort((a, b) => a.parentName.localeCompare(b.parentName));
      }

      // Child level: one child's own resolved relationships, own parent excluded.
      const childRelationships: Record<string, SystemRelationship[]> = {};
      for (const info of childInfoById.values()) {
        childRelationships[info.id] = buildRelationships(
          edgesByChild.get(info.id) ?? [],
          info.parent?.code ?? "",
        );
      }

      // Parent level: aggregate every child of the parent. Mutual can arise
      // through different child-system pairs.
      const parentRelationships: Record<string, SystemRelationship[]> = {};
      for (const code of PARENT_CODES) {
        const edges: Edge[] = [];
        for (const info of childInfoById.values()) {
          if (info.parent?.code !== code) continue;
          edges.push(...(edgesByChild.get(info.id) ?? []));
        }
        parentRelationships[code] = buildRelationships(edges, code);
      }


      const pathMembers = (pathMembersRes.data ?? []) as any[];
      const membersByPath = new Map<string, string[]>();
      for (const m of pathMembers) {
        const arr = membersByPath.get(m.critical_path_id) ?? [];
        arr.push(m.child_system_id);
        membersByPath.set(m.critical_path_id, arr);
      }

      const criticalChains: MatrixChain[] = paths.map((pathRow: any, i: number) => {
        const memberIds = membersByPath.get(pathRow.id) ?? [];
        const members = memberIds
          .map((id) => childInfoById.get(id))
          .filter((x): x is ChildInfo => !!x);
        const nodes = members.map((m) => m.name);
        const parentCode = members[0]?.parent?.code ?? "POS";
        return {
          label: pathRow?.name ?? `Chain ${i + 1}`,
          parentCode,
          nodes,
          note: pathRow?.bottleneck_logic ?? "",
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
        childRelationships,
        parentRelationships,
        scenarios,
      };
    },
  );

// ============================================================================
// Recommended actions for a single child system (Matrix Map drill-down)
//
// Second entry point into the SAME opportunity_actions cache used by Top
// Opportunities. Top Opportunities only generates copy for the <=12 featured
// systems; Matrix Map can be drilled into from any of the 50. Same lazy
// check-cache / generate-once / upsert pattern, so a row generated here is
// reused there and vice versa. Falls back to Roadmap Builder's static content
// when generation is unavailable.
// ============================================================================

export type ChildSystemActions = {
  childSystemId: string;
  code: string;
  name: string;
  source: "generated" | "fallback";
  whatWeSee: string;
  whyItMatters: string;
  startHere: string[];
};

const childActionsSchema = z.object({
  childSystemId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
});

export const getChildSystemActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => childActionsSchema.parse(d))
  .handler(async ({ data, context }): Promise<ChildSystemActions | null> => {
    const userId = context.userId;

    let assessmentId = data.assessmentId;
    if (!assessmentId) {
      const { data: latest } = await supabaseAdmin
        .from("assessments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) return null;
      assessmentId = latest.id;
    }

    const [childRes, cachedRes] = await Promise.all([
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("child_systems")
        .select("id,code,name,parent_system_id")
        .eq("id", data.childSystemId)
        .maybeSingle(),
      supabaseAdmin
        .from("opportunity_actions")
        .select("what_we_see,why_it_matters,start_here")
        .eq("assessment_id", assessmentId)
        .eq("user_id", userId)
        .eq("child_system_id", data.childSystemId)
        .maybeSingle(),
    ]);

    const child = (childRes as any)?.data;
    if (!child) return null;

    const cached = (cachedRes as any)?.data;
    if (cached) {
      return {
        childSystemId: child.id,
        code: child.code,
        name: child.name,
        source: "generated",
        whatWeSee: cached.what_we_see,
        whyItMatters: cached.why_it_matters,
        startHere: (cached.start_here ?? []) as string[],
      };
    }

    const [parentRes, failureRes, scoreRes, companyRes] = await Promise.all([
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("parent_systems")
        .select("name")
        .eq("id", child.parent_system_id)
        .maybeSingle(),
      (supabaseAdmin as any)
        .schema("revhealth2")
        .from("failure_map")
        .select(
          "core_symptoms,likely_root_causes,impacted_system_1,impacted_system_2,impacted_system_3",
        )
        .eq("child_system_id", child.id)
        .maybeSingle(),
      supabaseAdmin
        .from("assessment_scores")
        .select("health_score")
        .eq("assessment_id", assessmentId)
        .eq("user_id", userId)
        .eq("child_system_id", child.id)
        .maybeSingle(),
      supabaseAdmin
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const parentName = (parentRes as any)?.data?.name ?? "";
    const failure = (failureRes as any)?.data ?? {};
    const healthScore = Math.round(Number((scoreRes as any)?.data?.health_score ?? 0));

    const generated = await generateOpportunityCopy(
      assessmentId,
      userId,
      (companyRes as any)?.data?.company_name ?? "this company",
      [
        {
          code: child.code,
          name: child.name,
          parentName,
          healthScore,
          coreSymptom: failure.core_symptoms ?? "",
          likelyRootCause: failure.likely_root_causes ?? "",
          impacts: [failure.impacted_system_1, failure.impacted_system_2, failure.impacted_system_3]
            .filter((x: unknown): x is string => !!x),
          quickWin: false,
        },
      ],
    );

    const copy = generated.get(child.code);
    if (copy) {
      const { error: upErr } = await supabaseAdmin.from("opportunity_actions").upsert(
        [
          {
            assessment_id: assessmentId,
            user_id: userId,
            child_system_id: child.id,
            what_we_see: copy.whatWeSee,
            why_it_matters: copy.whyItMatters,
            start_here: copy.startHere,
            model_used: "claude-sonnet-4-5-20250929",
            generated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "assessment_id,child_system_id" },
      );
      if (upErr) console.error("[child-actions] upsert failed:", upErr.message);
      return {
        childSystemId: child.id,
        code: child.code,
        name: child.name,
        source: "generated",
        ...copy,
      };
    }

    // Fallback: the authored recommended-actions library.
    const { data: recRow } = await (supabaseAdmin as any)
      .schema("revhealth2")
      .from("recommended_actions")
      .select("why,task_1,task_2,task_3")
      .eq("child_system_id", child.id)
      .maybeSingle();
    const fbTasks = [recRow?.task_1, recRow?.task_2, recRow?.task_3]
      .map((t: string | null | undefined) => (t ?? "").trim())
      .filter(Boolean);
    return {
      childSystemId: child.id,
      code: child.code,
      name: child.name,
      source: "fallback",
      whatWeSee: failure.core_symptoms ?? `${child.name} is not yet operating at full strength.`,
      whyItMatters:
        (recRow?.why ?? "").trim() ||
        failure.likely_root_causes ||
        `Your ${child.name} score indicates structural gaps that need attention.`,
      startHere: fbTasks.length
        ? fbTasks
        : [
            `Audit your current ${child.name.toLowerCase()} approach end to end`,
            `Identify the 2–3 highest-impact gaps and assign owners`,
            `Set a 30-day checkpoint to measure progress`,
          ],
    };

  });

// ============================================================================
// Team Alignment Report
// ============================================================================

export type AlignmentSystem = {
  code: string;
  name: string;
  color: string;
  founderScore: number;
  teamAvg: number;
  gap: number;
  direction: "founder_high" | "team_high" | "aligned";
  status: "critical_gap" | "significant_gap" | "moderate_gap" | "strong_alignment";
  clusters: { label: string; score: number }[];
  narrative: string | null;
};

export type AlignmentRecommendation = {
  rank: number;
  title: string;
  rationale: string;
  effortLevel: string | null;
  timeframe: string | null;
  systemColor: string;
  systemName: string;
};

export type TeamAlignmentData = {
  tier: Tier;
  state: "preview" | "waiting" | "ready";
  profile: { first_name: string | null };
  company: { company_name: string | null };
  assessment: { id: string; submitted_at: string | null } | null;
  systems: AlignmentSystem[];
  summary: {
    overallAlignment: number;
    criticalGaps: number;
    leaderHigher: number;
    teamHigher: number;
  };
  recommendations: AlignmentRecommendation[];
  teamInviteUrl: string | null;
  invitedCount: number;
  completedCount: number;
};

function aShortName(full: string): string {
  // "Positioning System" -> "Positioning"
  return full.replace(/\s+System$/i, "").trim();
}

function statusFor(absGap: number): AlignmentSystem["status"] {
  if (absGap > 25) return "critical_gap";
  if (absGap > 15) return "significant_gap";
  if (absGap > 5) return "moderate_gap";
  return "strong_alignment";
}

function directionFor(gap: number): AlignmentSystem["direction"] {
  if (Math.abs(gap) < 5) return "aligned";
  return gap > 0 ? "founder_high" : "team_high";
}

function illustrativeAlignment(seed: string, code: string): {
  founderScore: number;
  teamAvg: number;
  clusters: { label: string; score: number }[];
} {
  const h1 = hashStr(`${seed}:align:${code}:founder`);
  const h2 = hashStr(`${seed}:align:${code}:team`);
  const founderScore = 55 + (h1 % 30); // 55-84
  const teamAvg = 45 + (h2 % 40); // 45-84
  const clusters = ["Leadership", "Sales", "Marketing"].map((label, i) => {
    const h = hashStr(`${seed}:align:${code}:c${i}`);
    return { label, score: Math.max(35, teamAvg - 8 + (h % 18)) };
  });
  return { founderScore, teamAvg, clusters };
}

const teamAlignmentSchema = z
  .object({
    assessmentId: z.string().uuid().optional(),
    // Full browser origin (e.g. https://app.example.com), passed from the client the
    // same way inviteTeamMember/resendTeamInvite already do. Never build an invite URL
    // from a server-side env var that may not be set - that is how this link previously
    // rendered as a bare relative path (/team/invite/...) with no domain.
    origin: z.string().url().optional(),
  })
  .optional();

export const getTeamAlignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => teamAlignmentSchema.parse(d) ?? {})
  .handler(async ({ data, context }): Promise<TeamAlignmentData | { error: "no_completed_assessment" }> => {
    const userId = context.userId;

    let assessmentId = data?.assessmentId;
    if (!assessmentId) {
      const { data: latest } = await supabaseAdmin
        .from("assessments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) return { error: "no_completed_assessment" as const };
      assessmentId = latest.id;
    }

    const [profileRes, companyRes, asmtRes, parentsRes, childrenRes, alignRes, teamsRes] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("first_name,tier")
          .eq("user_id", userId)
          .maybeSingle(),
        supabaseAdmin
          .from("company_profiles")
          .select("company_name")
          .eq("user_id", userId)
          .maybeSingle(),
        supabaseAdmin
          .from("assessments")
          .select("id,user_id,submitted_at")
          .eq("id", assessmentId)
          .maybeSingle(),
        (supabaseAdmin as any)
          .schema("revhealth2")
          .from("parent_systems")
          .select("id,code,name,color_hex,sort_order"),
        (supabaseAdmin as any)
          .schema("revhealth2")
          .from("child_systems")
          .select("id,parent_system_id"),
        supabaseAdmin
          .from("alignment_scores")
          .select("child_system_id,founder_score,team_avg_score,alignment_gap,gap_direction,alignment_status,cluster_scores")
          .eq("assessment_id", assessmentId)
          .eq("owner_id", userId),
        supabaseAdmin
          .from("teams")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle(),
      ]);

    if (!asmtRes.data) throw new Error("Assessment not found");
    if (asmtRes.data.user_id !== userId) throw new Error("Forbidden");

    const tier = ((profileRes.data?.tier ?? "starter") as Tier);
    const parents = (parentsRes.data ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    const children = (childrenRes.data ?? []) as any[];
    const align = (alignRes.data ?? []) as any[];

    const childToParent = new Map<string, string>();
    for (const c of children) childToParent.set(c.id, c.parent_system_id);

    // Team members count for waiting state
    let invitedCount = 0;
    let completedCount = 0;
    let teamInviteUrl: string | null = null;
    if (teamsRes.data?.id) {
      const { data: members } = await supabaseAdmin
        .from("team_members")
        .select("id,status,invite_token")
        .eq("team_id", teamsRes.data.id);
      invitedCount = members?.length ?? 0;
      completedCount = members?.filter((m: any) => m.status === "completed").length ?? 0;
      const firstToken = members?.find((m: any) => m.invite_token)?.invite_token;
      // Only build an absolute URL - never fall back to a relative path.
      if (firstToken && data?.origin) teamInviteUrl = `${data.origin}/team/invite/${firstToken}`;
    }

    // Diagnostic-only auxiliary data
    let observations: any[] = [];
    let recs: any[] = [];
    if (tier === "diagnostic") {
      const [obsRes, recsRes] = await Promise.all([
        supabaseAdmin
          .from("consultant_observations")
          .select("parent_system_id,generated_narrative")
          .eq("assessment_id", assessmentId)
          .eq("owner_id", userId),
        supabaseAdmin
          .from("diagnostic_recommendations")
          .select("rank,recommendation_text,rationale,timeframe,effort_level,child_system_id")
          .eq("assessment_id", assessmentId)
          .eq("owner_id", userId)
          .order("rank")
          .limit(3),
      ]);
      observations = obsRes.data ?? [];
      recs = recsRes.data ?? [];
    }
    const narrativeByParent = new Map<string, string>();
    for (const o of observations) {
      if (o.parent_system_id && o.generated_narrative) {
        narrativeByParent.set(o.parent_system_id, o.generated_narrative);
      }
    }

    // Aggregate alignment_scores per parent (avg founder/team across child rows)
    type Agg = {
      founderSum: number;
      teamSum: number;
      count: number;
      clusterAgg: Map<string, { sum: number; n: number }>;
    };
    const aggByParent = new Map<string, Agg>();
    for (const row of align) {
      const parentId = childToParent.get(row.child_system_id);
      if (!parentId) continue;
      let a = aggByParent.get(parentId);
      if (!a) {
        a = { founderSum: 0, teamSum: 0, count: 0, clusterAgg: new Map() };
        aggByParent.set(parentId, a);
      }
      a.founderSum += Number(row.founder_score ?? 0);
      a.teamSum += Number(row.team_avg_score ?? 0);
      a.count += 1;
      const cs = Array.isArray(row.cluster_scores) ? row.cluster_scores : [];
      for (const c of cs) {
        const label = String(c?.cluster_label ?? c?.label ?? "");
        const score = Number(c?.score ?? 0);
        if (!label) continue;
        let cur = a.clusterAgg.get(label);
        if (!cur) { cur = { sum: 0, n: 0 }; a.clusterAgg.set(label, cur); }
        cur.sum += score; cur.n += 1;
      }
    }

    const seed = assessmentId!;
    const hasRealData = aggByParent.size > 0;

    // State determination
    let state: TeamAlignmentData["state"];
    if (tier === "starter") {
      state = "preview";
    } else if (!hasRealData && invitedCount > 0 && completedCount < invitedCount) {
      state = "waiting";
    } else if (!hasRealData) {
      state = "preview"; // no team yet — show preview-style illustrative
    } else {
      state = "ready";
    }

    const systems: AlignmentSystem[] = parents.map((p: any) => {
      const color = `#${p.color_hex}`;
      const name = aShortName(p.name);
      const useReal = state === "ready" && aggByParent.has(p.id);

      let founderScore: number;
      let teamAvg: number;
      let clusters: { label: string; score: number }[];

      if (useReal) {
        const a = aggByParent.get(p.id)!;
        founderScore = Math.round(a.founderSum / a.count);
        teamAvg = Math.round(a.teamSum / a.count);
        clusters = Array.from(a.clusterAgg.entries()).map(([label, v]) => ({
          label,
          score: Math.round(v.sum / v.n),
        }));
        if (clusters.length === 0) {
          clusters = [
            { label: "Leadership", score: teamAvg },
            { label: "Sales", score: teamAvg },
            { label: "Marketing", score: teamAvg },
          ];
        }
      } else {
        const illus = illustrativeAlignment(seed, p.code);
        founderScore = illus.founderScore;
        teamAvg = illus.teamAvg;
        clusters = illus.clusters;
      }

      const gap = founderScore - teamAvg;
      const direction = directionFor(gap);
      const status = statusFor(Math.abs(gap));

      return {
        code: p.code,
        name,
        color,
        founderScore,
        teamAvg,
        gap,
        direction,
        status,
        clusters,
        narrative: tier === "diagnostic" ? narrativeByParent.get(p.id) ?? null : null,
      };
    });

    const overallAlignment = systems.length
      ? Math.round(systems.reduce((s, d) => s + (100 - Math.abs(d.gap)), 0) / systems.length)
      : 0;
    const criticalGaps = systems.filter((d) => d.status === "critical_gap").length;
    const leaderHigher = systems.filter((d) => d.direction === "founder_high" && d.status !== "strong_alignment").length;
    const teamHigher = systems.filter((d) => d.direction === "team_high" && d.status !== "strong_alignment").length;

    // Recommendations: map child_system_id to parent for color/name
    const parentByChild = new Map<string, any>();
    for (const c of children) {
      const p = parents.find((pp: any) => pp.id === c.parent_system_id);
      if (p) parentByChild.set(c.id, p);
    }
    const recommendations: AlignmentRecommendation[] = recs.map((r: any) => {
      const p = parentByChild.get(r.child_system_id);
      return {
        rank: r.rank,
        title: r.recommendation_text ?? "",
        rationale: r.rationale ?? "",
        effortLevel: r.effort_level ?? null,
        timeframe: r.timeframe ?? null,
        systemColor: p ? `#${p.color_hex}` : "#888880",
        systemName: p ? aShortName(p.name) : "",
      };
    });

    return {
      tier,
      state,
      profile: { first_name: profileRes.data?.first_name ?? null },
      company: { company_name: companyRes.data?.company_name ?? null },
      assessment: { id: asmtRes.data.id, submitted_at: asmtRes.data.submitted_at },
      systems,
      summary: { overallAlignment, criticalGaps, leaderHigher, teamHigher },
      recommendations,
      teamInviteUrl,
      invitedCount,
      completedCount,
    };
  });

// ============================================================================
// Founder Dependency
// ============================================================================

export type FDProcess = {
  code: string;
  systemName: string;
  name: string;
  type: "healthy" | "dangerous";
  risk: number; // 1-5
  difficulty: "easy" | "medium" | "hard";
  window: "immediate" | "1-7 days" | "7-30 days" | "30-90 days";
  whyDependent: string;
  firstStep: string;
};

export type FDSystem = {
  code: string;
  name: string;
  color: string;
  type: "healthy" | "dangerous" | "mixed";
  level: number;
  handoffReadiness: string;
  narrative: string | null;
};

export type FounderDependencyData = {
  tier: Tier;
  state: "ready" | "pending" | "preview";
  preliminary: boolean;
  profile: { first_name: string | null; company_name: string | null };
  assessment: { id: string; submitted_at: string | null };
  overall: {
    index: number;
    label: string; // "critical" | "high" | "moderate" | "low"
    executiveSummary: string | null;
    blastRadiusNarrative: string | null;
  };
  systems: FDSystem[];
  processes: FDProcess[];
};

const ILLUSTRATIVE_FD_SYSTEMS: Record<string, { type: "healthy" | "dangerous" | "mixed"; level: number; handoffReadiness: string; narrative: string }> = {
  POS: {
    type: "mixed", level: 65,
    handoffReadiness: "A documented positioning brief and ICP criteria need to exist before this can be delegated. Currently the positioning lives in the founder's head and surfaces differently in every sales conversation.",
    narrative: "Positioning is mixed — the founder has a sophisticated understanding of the market position that is not yet operationalised. The strategic positioning is healthy founder ownership. The day-to-day execution inconsistency is dangerous dependency.",
  },
  AUTH: {
    type: "healthy", level: 25,
    handoffReadiness: "Content strategy is partially documented. Thought leadership can be delegated with a clear editorial calendar and POV document.",
    narrative: "Authority is the healthiest system from a dependency perspective. The team produces content independently. The founder's role here is appropriate — setting strategic direction, not executing.",
  },
  CONV: {
    type: "dangerous", level: 88,
    handoffReadiness: "A documented sales playbook with stage criteria and a defined qualification process is the prerequisite. Until deals can progress without the founder, this system cannot scale.",
    narrative: "Conversion is the highest-risk dependency in the business. The founder closes the majority of significant deals personally. The team lacks a documented process that works without them.",
  },
  LFC: {
    type: "dangerous", level: 71,
    handoffReadiness: "Onboarding documentation and a defined CS handoff process are the immediate prerequisites. Retention monitoring needs a system, not a person.",
    narrative: "Lifecycle has dangerous dependency concentrated in onboarding and retention. New customers are onboarded differently depending on who handles them. Retention decisions run through the founder because there is no early warning system.",
  },
  VIS: {
    type: "dangerous", level: 82,
    handoffReadiness: "A shared dashboard with defined KPIs and a weekly revenue review cadence would reduce this dependency significantly. The team needs to be able to see the same data the founder sees.",
    narrative: "Visibility is acutely founder-dependent. The founder is the only person with a reliable picture of revenue performance. The team makes decisions based on incomplete information.",
  },
};

const ILLUSTRATIVE_FD_PROCESSES: Array<Omit<FDProcess, "systemName">> = [
  { code: "CONV", name: "Closes all enterprise deals personally", type: "dangerous", risk: 5, difficulty: "hard", window: "immediate", whyDependent: "No documented close methodology. Team lacks confidence in late-stage negotiation without founder involvement.", firstStep: "Shadow 3 deals, document the close framework, trial-close 1 deal independently with founder available." },
  { code: "VIS",  name: "Only person who interprets revenue data", type: "dangerous", risk: 5, difficulty: "medium", window: "immediate", whyDependent: "No shared dashboard. Revenue data lives across 3 tools only the founder knows how to reconcile.", firstStep: "Build a single revenue dashboard with definitions agreed by the team. Weekly 30-min revenue review with team." },
  { code: "LFC",  name: "Personally manages at-risk customer relationships", type: "dangerous", risk: 4, difficulty: "medium", window: "1-7 days", whyDependent: "No early warning system. CS escalates to the founder reactively when a customer goes quiet.", firstStep: "Define 3 early warning signals. Assign CS owner per account with escalation criteria." },
  { code: "CONV", name: "Approves all discounts and pricing exceptions", type: "dangerous", risk: 4, difficulty: "easy", window: "1-7 days", whyDependent: "No pricing authority matrix. Every non-standard deal requires founder sign-off.", firstStep: "Document a tiered pricing authority matrix — define what CS/AE can approve without escalation." },
  { code: "POS",  name: "Sole articulator of market positioning to new hires", type: "dangerous", risk: 3, difficulty: "easy", window: "7-30 days", whyDependent: "Positioning brief does not exist in written form. New hires learn it through osmosis.", firstStep: "Write a 1-page positioning brief. Add to onboarding. Test: ask 3 team members to pitch the company." },
  { code: "VIS",  name: "Board reporting relies entirely on founder preparation", type: "dangerous", risk: 4, difficulty: "medium", window: "7-30 days", whyDependent: "No automated reporting. Every board pack is built manually by the founder.", firstStep: "Build a board report template. Assign data ownership to each section. Automate data pulls." },
  { code: "LFC",  name: "Personally onboards all new customers", type: "dangerous", risk: 3, difficulty: "medium", window: "30-90 days", whyDependent: "Onboarding is undocumented and varies by customer. The founder handles the complex ones directly.", firstStep: "Document the onboarding process for the top 3 customer types. Pilot with CS team on next 2 customers." },
  { code: "POS",  name: "Sets overall market strategy and direction", type: "healthy", risk: 1, difficulty: "hard", window: "30-90 days", whyDependent: "Appropriate founder ownership at Seed stage. Strategy should be founder-led.", firstStep: "Begin involving a senior hire in strategic planning sessions to build context for future transition." },
  { code: "AUTH", name: "Defines thought leadership point of view", type: "healthy", risk: 1, difficulty: "medium", window: "30-90 days", whyDependent: "Thought leadership authentically requires founder voice at this stage. Not a risk.", firstStep: "Document the core POV so it can be expressed by others in writing and sales conversations." },
  { code: "AUTH", name: "Reviews and approves content before publication", type: "healthy", risk: 2, difficulty: "easy", window: "30-90 days", whyDependent: "Quality control appropriate now. Should transition to editorial standards document.", firstStep: "Create a content standards document. Pilot self-approval for lower-stakes content." },
];

const ILLUSTRATIVE_EXEC_SUMMARY = "The company has built a functional and growing business, but it runs significantly through the founder. Sales, strategic positioning, and most revenue-critical decisions require founder involvement. This is common at Seed stage and not inherently problematic — but the current dependency profile will create a structural ceiling before Series A close rates and team scalability can support the next phase of growth. The three highest-risk dependency areas are Sales Process, Revenue Visibility, and Positioning — all of which require founder presence to function reliably.";

function depLabel(index: number): string {
  if (index > 70) return "high";
  if (index > 50) return "moderate";
  if (index > 30) return "low-moderate";
  return "low";
}

export const getFounderDependency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(async ({ data, context }): Promise<FounderDependencyData | { error: "no_completed_assessment" }> => {
    const userId = context.userId;

    let assessmentId = data?.assessmentId;
    if (!assessmentId) {
      const { data: latest } = await supabaseAdmin
        .from("assessments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) return { error: "no_completed_assessment" as const };
      assessmentId = latest.id;
    }

    const [profileRes, companyRes, asmtRes, parentsRes, scoresRes, fdScoreRes, fdSystemsRes, fdProcRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("first_name,tier").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("company_profiles").select("company_name").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("assessments").select("id,user_id,submitted_at").eq("id", assessmentId).maybeSingle(),
        (supabaseAdmin as any).schema("revhealth2").from("parent_systems").select("id,code,name,color_hex,sort_order"),
        supabaseAdmin.from("assessment_scores").select("tracking_score,health_score,is_soft_shadow,is_hard_shadow").eq("assessment_id", assessmentId).eq("user_id", userId),
        supabaseAdmin.from("founder_dependency_scores").select("overall_dependency_index,dependency_label,executive_summary,blast_radius_narrative").eq("assessment_id", assessmentId).eq("owner_id", userId).maybeSingle(),
        supabaseAdmin.from("founder_dependency_systems").select("parent_system_id,dependency_type,dependency_level,handoff_readiness,narrative").eq("assessment_id", assessmentId).eq("owner_id", userId),
        supabaseAdmin.from("founder_dependency_processes").select("parent_system_id,process_name,why_founder_dependent,risk_level,delegation_difficulty,recommended_first_step,blast_radius_window,dependency_type,sort_order").eq("assessment_id", assessmentId).eq("owner_id", userId).order("sort_order"),
      ]);

    if (!asmtRes.data) throw new Error("Assessment not found");
    if (asmtRes.data.user_id !== userId) throw new Error("Forbidden");

    const tier = ((profileRes.data?.tier ?? "starter") as Tier);
    const parents = (parentsRes.data ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    const parentByCode = new Map<string, any>();
    const parentById = new Map<string, any>();
    for (const p of parents) { parentByCode.set(p.code, p); parentById.set(p.id, p); }

    const fdScore = fdScoreRes.data;
    const fdSystems = (fdSystemsRes.data ?? []) as any[];
    const fdProc = (fdProcRes.data ?? []) as any[];
    const scores = (scoresRes.data ?? []) as any[];

    const hasRealFD = tier === "diagnostic" && !!fdScore && fdSystems.length > 0;

    let state: FounderDependencyData["state"];
    let preliminary = false;
    if (tier === "starter") state = "preview";
    else if (tier === "diagnostic" && hasRealFD) state = "ready";
    else if (tier === "diagnostic") { state = "pending"; preliminary = true; }
    else { state = "preview"; preliminary = true; } // pro: illustrative w/ derived index

    // Derive preliminary index from assessment_scores
    let derivedIndex = 0;
    if (scores.length > 0) {
      const sum = scores.reduce((s, r) => s + (100 - Number(r.tracking_score ?? 0)), 0);
      derivedIndex = Math.round(sum / scores.length);
    }

    let overallIndex: number;
    let overallLabel: string;
    let executiveSummary: string | null = null;
    let blastRadiusNarrative: string | null = null;

    if (state === "ready") {
      overallIndex = Math.round(Number(fdScore!.overall_dependency_index ?? 0));
      overallLabel = fdScore!.dependency_label ?? depLabel(overallIndex);
      executiveSummary = fdScore!.executive_summary ?? null;
      blastRadiusNarrative = fdScore!.blast_radius_narrative ?? null;
    } else if (state === "pending") {
      overallIndex = derivedIndex;
      overallLabel = depLabel(overallIndex);
    } else {
      // preview (starter or pro illustrative)
      overallIndex = tier === "pro" && derivedIndex > 0 ? derivedIndex : 74;
      overallLabel = depLabel(overallIndex);
      executiveSummary = ILLUSTRATIVE_EXEC_SUMMARY;
    }

    // Systems
    let systems: FDSystem[];
    if (state === "ready") {
      systems = parents.map((p: any) => {
        const row = fdSystems.find((r) => r.parent_system_id === p.id);
        return {
          code: p.code,
          name: p.name,
          color: `#${p.color_hex}`,
          type: (row?.dependency_type ?? "healthy") as FDSystem["type"],
          level: Math.round(Number(row?.dependency_level ?? 0)),
          handoffReadiness: row?.handoff_readiness ?? "",
          narrative: row?.narrative ?? null,
        };
      });
    } else {
      systems = parents.map((p: any) => {
        const ill = ILLUSTRATIVE_FD_SYSTEMS[p.code] ?? { type: "healthy" as const, level: 30, handoffReadiness: "", narrative: "" };
        return {
          code: p.code,
          name: p.name,
          color: `#${p.color_hex}`,
          type: ill.type,
          level: ill.level,
          handoffReadiness: ill.handoffReadiness,
          narrative: tier === "diagnostic" ? ill.narrative : null,
        };
      });
    }

    // Processes
    let processes: FDProcess[];
    if (state === "ready") {
      processes = fdProc.map((r) => {
        const p = parentById.get(r.parent_system_id);
        return {
          code: p?.code ?? "",
          systemName: p?.name ?? "",
          name: r.process_name ?? "",
          type: (r.dependency_type ?? "dangerous") as "healthy" | "dangerous",
          risk: Math.max(1, Math.min(5, Number(r.risk_level ?? 1))),
          difficulty: (r.delegation_difficulty ?? "medium") as "easy" | "medium" | "hard",
          window: (r.blast_radius_window ?? "30-90 days") as FDProcess["window"],
          whyDependent: r.why_founder_dependent ?? "",
          firstStep: r.recommended_first_step ?? "",
        };
      });
    } else if (state === "pending") {
      processes = [];
    } else {
      processes = ILLUSTRATIVE_FD_PROCESSES.map((p) => ({
        ...p,
        systemName: parentByCode.get(p.code)?.name ?? p.code,
      }));
    }

    return {
      tier,
      state,
      preliminary,
      profile: {
        first_name: profileRes.data?.first_name ?? null,
        company_name: companyRes.data?.company_name ?? null,
      },
      assessment: { id: asmtRes.data.id, submitted_at: asmtRes.data.submitted_at },
      overall: { index: overallIndex, label: overallLabel, executiveSummary, blastRadiusNarrative },
      systems,
      processes,
    };
  });

// ---------------------------------------------------------------------------
// Shadow Systems
// ---------------------------------------------------------------------------

export type ShadowSystemItem = {
  id: string;
  name: string;
  parentSystem: string;
  parentColor: string;
  type: "spreadsheet" | "document" | "messaging" | "tribal" | "workaround" | "informal_process";
  keyPerson: string;
  compensatesFor: string;
  riskLevel: number;
  actionType: "document" | "formalise" | "rebuild" | "eliminate";
  finding: string;
  recommended: string;
};

export type ShadowSystemsData = {
  tier: Tier;
  state: "preview" | "ready" | "pending"; // pending = diagnostic but no shadow data
  shadows: ShadowSystemItem[];        // real shadow systems (diagnostic + ready)
  systemsCount: number;               // distinct parent systems for banner
};

export const getShadowSystems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summarySchema.parse(d) ?? {})
  .handler(async ({ context }): Promise<ShadowSystemsData> => {
    const userId = context.userId;

    const profileRes = await supabaseAdmin
      .from("profiles").select("tier").eq("user_id", userId).maybeSingle();
    const tier = ((profileRes.data?.tier ?? "starter") as Tier);

    if (tier !== "diagnostic") {
      return { tier, state: "preview", shadows: [], systemsCount: 0 };
    }

    const { data: latest } = await supabaseAdmin
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) return { tier, state: "pending", shadows: [], systemsCount: 0 };

    const [parentsRes, procRes] = await Promise.all([
      (supabaseAdmin as any).schema("revhealth2").from("parent_systems").select("id,name,color_hex"),
      (supabaseAdmin as any)
        .from("founder_dependency_processes")
        .select("id,parent_system_id,process_name,why_founder_dependent,risk_level,delegation_difficulty,recommended_first_step,is_shadow_system")
        .eq("assessment_id", latest.id)
        .eq("owner_id", userId)
        .eq("is_shadow_system", true)
        .order("sort_order"),
    ]);

    const parentById = new Map<string, any>();
    for (const p of (parentsRes.data ?? [])) parentById.set(p.id, p);

    const diffToAction: Record<string, ShadowSystemItem["actionType"]> = {
      easy: "document", medium: "formalise", hard: "rebuild",
    };

    const shadows: ShadowSystemItem[] = ((procRes.data ?? []) as any[]).map((r) => {
      const p = parentById.get(r.parent_system_id);
      return {
        id: r.id,
        name: r.process_name ?? "",
        parentSystem: p?.name ?? "",
        parentColor: p ? `#${p.color_hex}` : "#888880",
        type: "informal_process",
        keyPerson: "Team member on file",
        compensatesFor: p?.name ?? "",
        riskLevel: Math.max(1, Math.min(5, Number(r.risk_level ?? 3))),
        actionType: diffToAction[r.delegation_difficulty ?? "medium"] ?? "formalise",
        finding: r.why_founder_dependent ?? "",
        recommended: r.recommended_first_step ?? "",
      };
    });

    if (shadows.length === 0) {
      return { tier, state: "pending", shadows: [], systemsCount: 0 };
    }

    const systemsCount = new Set(shadows.map((s) => s.parentSystem)).size;
    return { tier, state: "ready", shadows, systemsCount };
  });


// ---------------------------------------------------------------------------
// Roadmap Builder
// ---------------------------------------------------------------------------


export type RoadmapHorizon = "quick_win" | "30_days" | "90_days" | "120_days";

export type RoadmapItem = {
  code: string;            // child system code
  childSystemId: string;   // uuid, used to persist
  name: string;
  parent: string;
  parentCode: string;
  color: string;
  healthScore: number;
  effort: "low" | "medium" | "high";
  horizon: RoadmapHorizon;
  title: string;
  why: string;
  tasks: string[];
  outcomes: string[];
  kpis: string[];
  warnings: string[];
  included: boolean;
  selectedTaskIndices: number[];
};

export type RoadmapData = {
  tier: Tier;
  assessmentId: string | null;     // null => no persistence (illustrative)
  items: RoadmapItem[];
};

const PARENT_COLOR_BY_CODE: Record<string, string> = {
  POS: "#3B82F6", AUTH: "#10B981", CONV: "#F05223", LFC: "#8B5CF6", VIS: "#F59E0B",
};

// Illustrative items shown when no real assessment data exists
const ILLUSTRATIVE_CODES: { code: string; name: string; parent: string; parentCode: string; healthScore: number }[] = [
  { code: "ICP", name: "Ideal Customer Profile", parent: "Positioning", parentCode: "POS", healthScore: 48 },
  { code: "TST", name: "Testimonials", parent: "Authority", parentCode: "AUTH", healthScore: 65 },
  { code: "FC", name: "Forecasting", parent: "Visibility", parentCode: "VIS", healthScore: 52 },
  { code: "SP", name: "Sales Process", parent: "Lifecycle", parentCode: "LFC", healthScore: 52 },
  { code: "RET", name: "Retention", parent: "Lifecycle", parentCode: "LFC", healthScore: 38 },
  { code: "COB", name: "Customer Onboarding", parent: "Lifecycle", parentCode: "LFC", healthScore: 44 },
  { code: "KPI", name: "KPI Frameworks", parent: "Visibility", parentCode: "VIS", healthScore: 75 },
  { code: "DG", name: "Demand Generation", parent: "Conversion", parentCode: "CONV", healthScore: 69 },
];

function horizonFor(health: number, tracking: number): RoadmapHorizon {
  if (health < 50 && tracking < 40) return "quick_win";
  if (health < 60) return "30_days";
  if (health < 70) return "90_days";
  return "120_days";
}

function effortFor(health: number): "low" | "medium" | "high" {
  if (health < 50) return "low";
  if (health < 65) return "medium";
  return "high";
}

type RecommendedActionRow = {
  child_system_id: string;
  title: string | null;
  why: string | null;
  task_1: string | null; task_2: string | null; task_3: string | null;
  task_4: string | null; task_5: string | null;
  outcome_1: string | null; outcome_2: string | null; outcome_3: string | null;
  kpi_1: string | null; kpi_2: string | null; kpi_3: string | null;
  warning_1: string | null; warning_2: string | null;
  warning_3: string | null; warning_4: string | null;
};

const REC_COLUMNS =
  "child_system_id,title,why,task_1,task_2,task_3,task_4,task_5," +
  "outcome_1,outcome_2,outcome_3,kpi_1,kpi_2,kpi_3," +
  "warning_1,warning_2,warning_3,warning_4";

function compact(values: (string | null | undefined)[]): string[] {
  return values.map((v) => (v ?? "").trim()).filter(Boolean);
}

function contentFromRow(row: RecommendedActionRow) {
  return {
    title: (row.title ?? "").trim(),
    why: (row.why ?? "").trim(),
    tasks: compact([row.task_1, row.task_2, row.task_3, row.task_4, row.task_5]),
    outcomes: compact([row.outcome_1, row.outcome_2, row.outcome_3]),
    kpis: compact([row.kpi_1, row.kpi_2, row.kpi_3]),
    warnings: compact([row.warning_1, row.warning_2, row.warning_3, row.warning_4]),
  };
}

const roadmapSchema = z.object({}).optional();

export const getRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roadmapSchema.parse(d) ?? {})
  .handler(async ({ context }): Promise<RoadmapData> => {
    const userId = context.userId;

    const profileRes = await supabaseAdmin
      .from("profiles").select("tier").eq("user_id", userId).maybeSingle();
    const tier = ((profileRes.data?.tier ?? "starter") as Tier);

    // Latest completed assessment (any tier may have one)
    const { data: latest } = await supabaseAdmin
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Always load child_systems so we can map illustrative codes -> uuids
    const [childRes, parentRes, recRes] = await Promise.all([
      (supabaseAdmin as any).schema("revhealth2").from("child_systems").select("id,code,name,parent_system_id"),
      (supabaseAdmin as any).schema("revhealth2").from("parent_systems").select("id,code,name,color_hex"),
      (supabaseAdmin as any).schema("revhealth2").from("recommended_actions").select(REC_COLUMNS),
    ]);
    const parents: any[] = parentRes.data ?? [];
    const parentById = new Map<string, any>(parents.map((p: any) => [p.id, p]));
    const children: any[] = childRes.data ?? [];
    const childById = new Map<string, any>(children.map((c: any) => [c.id, c]));
    const childByCode = new Map<string, any>(children.map((c: any) => [c.code, c]));
    const recByChildId = new Map<string, RecommendedActionRow>(
      ((recRes.data ?? []) as RecommendedActionRow[]).map((r) => [r.child_system_id, r]),
    );

    let items: RoadmapItem[] = [];
    let assessmentId: string | null = null;

    if (latest) {
      assessmentId = latest.id;
      const { data: scores } = await supabaseAdmin
        .from("assessment_scores")
        .select("child_system_id,health_score,tracking_score,severity")
        .eq("assessment_id", latest.id);

      for (const s of (scores ?? [])) {
        const child = childById.get(s.child_system_id);
        if (!child) continue;
        const parent = parentById.get(child.parent_system_id);
        if (!parent) continue;
        const rec = recByChildId.get(child.id);
        if (!rec) continue; // no authored content => not shown
        const health = Number(s.health_score ?? 0);
        const tracking = Number(s.tracking_score ?? 0);
        items.push({
          code: child.code,
          childSystemId: child.id,
          name: child.name,
          parent: parent.name,
          parentCode: parent.code,
          color: PARENT_COLOR_BY_CODE[parent.code] ?? `#${parent.color_hex}`,
          healthScore: Math.round(health),
          effort: effortFor(health),
          horizon: horizonFor(health, tracking),
          included: true,
          selectedTaskIndices: [],
          ...contentFromRow(rec),
        });
      }
    }

    if (items.length === 0) {
      // Illustrative items (no scores yet) — still resolve childSystemId via code map
      const fallbackHorizon: Record<string, RoadmapHorizon> = {
        ICP: "quick_win", TST: "quick_win",
        FC: "30_days", SP: "30_days", RET: "30_days",
        COB: "90_days", KPI: "90_days",
        DG: "120_days",
      };
      for (const ill of ILLUSTRATIVE_CODES) {
        const child = childByCode.get(ill.code);
        const rec = child ? recByChildId.get(child.id) : undefined;
        if (!rec) continue;
        items.push({
          code: ill.code,
          childSystemId: child?.id ?? "",
          name: ill.name,
          parent: ill.parent,
          parentCode: ill.parentCode,
          color: PARENT_COLOR_BY_CODE[ill.parentCode],
          healthScore: ill.healthScore,
          effort: effortFor(ill.healthScore),
          horizon: fallbackHorizon[ill.code] ?? "30_days",
          included: true,
          selectedTaskIndices: [],
          ...contentFromRow(rec),
        });
      }
    }

    // Saved inclusion / task selections (only if we have an assessment)
    if (assessmentId) {
      const { data: saved } = await supabaseAdmin
        .from("roadmap_task_selections")
        .select("child_system_id,included,selected_task_indices")
        .eq("assessment_id", assessmentId)
        .eq("user_id", userId);
      const savedByChild = new Map<string, any>((saved ?? []).map((r: any) => [r.child_system_id, r]));
      items = items.map((it) => {
        const row = savedByChild.get(it.childSystemId);
        if (!row) return it;
        return {
          ...it,
          included: row.included !== false,
          selectedTaskIndices: ((row.selected_task_indices ?? []) as number[])
            .filter((i) => Number.isInteger(i) && i >= 0 && i < it.tasks.length),
        };
      });
    }

    return { tier, assessmentId, items };
  });

async function assertAssessmentOwner(assessmentId: string, userId: string) {
  const { data: asmt, error } = await supabaseAdmin
    .from("assessments")
    .select("user_id")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!asmt || asmt.user_id !== userId) throw new Error("Forbidden");
}

const inclusionSchema = z.object({
  assessmentId: z.string().uuid(),
  childSystemId: z.string().uuid(),
  included: z.boolean(),
});

export const setRoadmapInclusion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inclusionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAssessmentOwner(data.assessmentId, context.userId);
    const { error } = await supabaseAdmin
      .from("roadmap_task_selections")
      .upsert(
        {
          assessment_id: data.assessmentId,
          user_id: context.userId,
          child_system_id: data.childSystemId,
          included: data.included,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id,child_system_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const tasksSchema = z.object({
  assessmentId: z.string().uuid(),
  childSystemId: z.string().uuid(),
  taskIndices: z.array(z.number().int().min(0).max(4)).max(3),
});

export const setRoadmapTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tasksSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAssessmentOwner(data.assessmentId, context.userId);
    const unique = Array.from(new Set(data.taskIndices)).sort((a, b) => a - b);
    const { error } = await supabaseAdmin
      .from("roadmap_task_selections")
      .upsert(
        {
          assessment_id: data.assessmentId,
          user_id: context.userId,
          child_system_id: data.childSystemId,
          selected_task_indices: unique,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id,child_system_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
