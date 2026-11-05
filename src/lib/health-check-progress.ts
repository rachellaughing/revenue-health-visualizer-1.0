// Pure progress helpers for the Health Check questionnaire.
// These never change scoring or saving — they only describe progress.

export type LocalAnswer = { health: number | null; tracking: number | null } | undefined;

/** Answered = agreement chosen and tracking answered (matches the server's completion rule). */
export function isAreaAnswered(r: LocalAnswer): boolean {
  return !!r && r.health !== null && r.health > 0 && r.tracking !== null;
}

/** Skipped = a saved row whose agreement answer is null. */
export function isAreaSkipped(r: LocalAnswer): boolean {
  return !!r && r.health === null;
}

/** Done = answered or skipped. Used for "can move on" and subsystem check marks. */
export function isAreaDone(r: LocalAnswer): boolean {
  return isAreaAnswered(r) || isAreaSkipped(r);
}

export const SECONDS_PER_AREA = 20;
export const ESTIMATE_MIN_ANSWERED = 5;

/** Time estimate label; null when it should be hidden. */
export function timeEstimateLabel(remainingAreas: number, answeredCount: number): string | null {
  if (answeredCount < ESTIMATE_MIN_ANSWERED) return null;
  if (remainingAreas <= 0) return null;
  const minutes = Math.round((remainingAreas * SECONDS_PER_AREA) / 60);
  if (minutes < 1) return "Under 1 min left (estimate)";
  return `About ${minutes} min left (estimate)`;
}

type P = { id: string; sort_order: number };
type C = { id: string; code: string; parent_system_id: string; sort_order: number };
type A = { id: string; child_system_id: string; sort_order: number; question_id: string };

export type Step<PP, CC, AA> = { parent: PP; child: CC; area: AA };

/**
 * Ordered list of areas for Focus mode: system → subsystem → area.
 * Starter only steps through the subsystems the person selected.
 */
export function buildSteps<PP extends P, CC extends C, AA extends A>(
  parents: PP[],
  children: CC[],
  areas: AA[],
  tier: string,
  selectedCodes: Set<string>,
): Step<PP, CC, AA>[] {
  const steps: Step<PP, CC, AA>[] = [];
  const ps = [...parents].sort((a, b) => a.sort_order - b.sort_order);
  for (const p of ps) {
    const cs = children
      .filter((c) => c.parent_system_id === p.id)
      .filter((c) => tier !== "starter" || selectedCodes.has(c.code))
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const c of cs) {
      const as = areas
        .filter((a) => a.child_system_id === c.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const a of as) steps.push({ parent: p, child: c, area: a });
    }
  }
  return steps;
}
