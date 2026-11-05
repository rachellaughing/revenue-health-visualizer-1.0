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

const CLASS_BY_CODE: Record<SystemCode, string> = {
  POS: "mm-sys--pos", AUTH: "mm-sys--auth", CONV: "mm-sys--conv", LFC: "mm-sys--lfc", VIS: "mm-sys--vis",
};

/** Class that sets --sys-color / --sys-color-bg for a system code or name. */
export function getSystemClass(input: string | null | undefined): string {
  if (!input) return "mm-sys--none";
  const raw = String(input).trim();
  const upper = raw.toUpperCase();
  if (upper in CLASS_BY_CODE) return CLASS_BY_CODE[upper as SystemCode];
  const code = NAME_TO_CODE[raw.replace(/\s+system$/i, "").trim().toLowerCase()];
  return code ? CLASS_BY_CODE[code] : "mm-sys--none";
}
