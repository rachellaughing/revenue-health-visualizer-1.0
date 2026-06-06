// Deterministic illustrative scores per Phase 3 brief §07.
// Returns stable per-seed scores in the 1.8 — 3.3 range.

export type SystemId = "positioning" | "authority" | "conversion" | "lifecycle" | "visibility";

export type SystemScore = {
  id: SystemId;
  label: string;
  score: number;
  colorVar: string;
};

const SYSTEMS: { id: SystemId; label: string; colorVar: string }[] = [
  { id: "positioning", label: "Positioning", colorVar: "var(--mm-sys-positioning)" },
  { id: "authority", label: "Authority", colorVar: "var(--mm-sys-authority)" },
  { id: "conversion", label: "Conversion", colorVar: "var(--mm-sys-conversion)" },
  { id: "lifecycle", label: "Lifecycle", colorVar: "var(--mm-sys-lifecycle)" },
  { id: "visibility", label: "Visibility", colorVar: "var(--mm-sys-visibility)" },
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getIllustrativeScores(seed: string): SystemScore[] {
  return SYSTEMS.map((sys, i) => {
    const h = hash(`${seed}:${sys.id}:${i}`);
    // Map to range [1.8, 3.3]
    const score = Math.round(((h % 1500) / 1000 + 1.8) * 10) / 10;
    return { ...sys, score };
  });
}

export function getOverall(scores: SystemScore[]): number {
  const avg = scores.reduce((s, x) => s + x.score, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

export function quarterOf(date: Date): { q: number; year: number; label: string; monthYear: string } {
  const q = Math.floor(date.getMonth() / 3) + 1;
  const year = date.getFullYear();
  const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric" });
  return { q, year, label: `Q${q} ${year}`, monthYear };
}

export function nextQuarter(d: Date): { q: number; year: number; label: string } {
  const cur = quarterOf(d);
  const q = cur.q === 4 ? 1 : cur.q + 1;
  const year = cur.q === 4 ? cur.year + 1 : cur.year;
  return { q, year, label: `Q${q}` };
}
