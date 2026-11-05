// Single source of truth for the five Revenue System colours.
// Values are CSS variables so light/dark themes stay in sync.
export type SystemCode = "POS" | "AUTH" | "CONV" | "LFC" | "VIS";

export const SYSTEM_COLOR: Record<SystemCode, string> = {
  POS: "var(--mm-sys-positioning)",
  AUTH: "var(--mm-sys-authority)",
  CONV: "var(--mm-sys-conversion)",
  LFC: "var(--mm-sys-lifecycle)",
  VIS: "var(--mm-sys-visibility)",
};

const NAME_TO_CODE: Record<string, SystemCode> = {
  positioning: "POS",
  authority: "AUTH",
  conversion: "CONV",
  lifecycle: "LFC",
  visibility: "VIS",
};

const FALLBACK = "var(--mm-teal)";

/** Accepts a system code ("AUTH") or name ("Authority System" / "authority"). */
export function getSystemColor(input: string | null | undefined): string {
  if (!input) return FALLBACK;
  const raw = String(input).trim();
  const upper = raw.toUpperCase();
  if (upper in SYSTEM_COLOR) return SYSTEM_COLOR[upper as SystemCode];
  const name = raw.replace(/\s+system$/i, "").trim().toLowerCase();
  const code = NAME_TO_CODE[name];
  return code ? SYSTEM_COLOR[code] : FALLBACK;
}
