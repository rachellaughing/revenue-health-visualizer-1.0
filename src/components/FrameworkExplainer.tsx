import { useEffect, useState } from "react";
import { getSystemClass } from "@/lib/system-colors";
import type { ParentSystem, ChildSystem } from "@/lib/healthcheck.functions";

const ORDERED_SYSTEM_NAMES = [
  "Positioning",
  "Authority",
  "Conversion",
  "Lifecycle",
  "Visibility",
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden
      className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--mm-text-muted)]" />
    </svg>
  );
}

export type FrameworkExplainerProps = {
  context: "dashboard" | "healthcheck";
  defaultOpen?: boolean;
  parents: ParentSystem[];
  children: ChildSystem[];
  /** Codes of child systems the user has selected. Empty on paid tiers → treat all as covered. */
  selectedChildCodes: string[];
  tier: "starter" | "pro" | "diagnostic";
};

export function FrameworkExplainer({
  context,
  defaultOpen = false,
  parents,
  children,
  selectedChildCodes,
  tier,
}: FrameworkExplainerProps) {
  const storageKey = `fx-explainer-open:${context}`;
  const [open, setOpen] = useState<boolean>(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.sessionStorage.getItem(storageKey);
    if (v !== null) setOpen(v === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  // Group children by parent id, sorted by parent order then child order.
  const childrenByParent = new Map<string, ChildSystem[]>();
  for (const c of children) {
    const arr = childrenByParent.get(c.parent_system_id) ?? [];
    arr.push(c);
    childrenByParent.set(c.parent_system_id, arr);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }

  const sortedParents = [...parents].sort((a, b) => {
    const ai = ORDERED_SYSTEM_NAMES.indexOf(a.name);
    const bi = ORDERED_SYSTEM_NAMES.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    return a.sort_order - b.sort_order;
  });

  // Paid tiers evaluate everything; snapshot tier uses the user's selection.
  const allChildCodes = new Set(children.map((c) => c.code));
  const effectiveSelected =
    tier === "starter"
      ? new Set(selectedChildCodes)
      : allChildCodes;

  const totalSelected = effectiveSelected.size;
  const totalEvaluationAreas = totalSelected * 4;

  const dotClasses = sortedParents.map((p) => getSystemClass(p.code ?? p.name));
  const faint = "text-[color-mix(in_srgb,var(--mm-on-dark)_50%,transparent)]";

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--mm-border-subtle)] bg-[var(--mm-surface)]">
      {/* Collapsed bar */}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-[var(--mm-surface-sunken)] px-4 py-3 text-left">
        <div className="mm-row mm-gap-sm min-w-0">
          <div className="flex shrink-0">
            {dotClasses.map((c, i) => (
              <div key={i} className={`${c} h-[7px] w-[7px] rounded-full border-[1.5px] border-[var(--mm-surface-sunken)] bg-[var(--sys-color)] ${i === 0 ? "" : "-ml-[2.5px]"}`} />
            ))}
          </div>
          <span className="overflow-hidden text-ellipsis text-[13.5px] text-[var(--mm-text)]">
            Revenue Health Snapshot™ · {totalSelected} of 50 subsystems ·{" "}
            {totalEvaluationAreas} evaluation areas{" "}
            <span className="ml-1.5 font-semibold text-[var(--mm-link)]">How it works</span>
          </span>
        </div>
        <Chevron open={open} />
      </button>

      {/* Expanded body */}
      {open && (
        <div className="bg-[var(--mm-abyss)] px-5 pt-6 pb-5 text-[var(--mm-on-dark)]">
          <div className="mm-heading-md mb-2.5">A prompt didn't create the Revenue Health Matrix™.</div>
          <p className="mm-on-dark-muted m-0 mb-4 text-[13px] leading-[1.6]">
            Five interconnected systems, built from years of pattern recognition
            inside founder-led companies — not generated. Here's the shape of it,
            and what you're evaluating right now.
          </p>

          {/* Stat row */}
          <div className="mb-5 flex border-b border-[color-mix(in_srgb,var(--mm-on-dark)_12%,transparent)] pb-[18px]">
            {[
              { num: "5", label: "SYSTEMS", muted: false, annotation: null as string | null },
              { num: "10", label: "SUBSYSTEMS EACH", muted: true, annotation: tier === "starter" ? "3 in your Snapshot" : null },
              { num: "200", label: "EVALUATION AREAS", muted: true, annotation: tier === "starter" ? "60 in your Snapshot" : null },
            ].map((item, i) => (
              <div key={item.label}
                className={`flex-1 ${i > 0 ? "border-l border-[color-mix(in_srgb,var(--mm-on-dark)_12%,transparent)] pl-3.5" : ""}`}>
                <div className={`font-display text-[30px] leading-none ${item.muted ? faint : ""}`}>{item.num}</div>
                <div className={`mt-1 text-[9.5px] tracking-[0.08em] ${faint}`}>{item.label}</div>
                {item.annotation && (
                  <div className="mt-1 text-[9.5px] text-[var(--mm-teal-bright)]">{item.annotation}</div>
                )}
              </div>
            ))}
          </div>

          {/* Snapshot summary */}
          <div className="mb-3.5 text-[13px]">
            {tier === "starter" ? (
              <>
                Your Snapshot™ covers <strong>{totalSelected} of 50</strong>{" "}
                subsystems — <strong>{totalEvaluationAreas} evaluation areas</strong>.
                The Snapshot covers 3 subsystems per system by design.
              </>
            ) : (
              <>
                You have access to all <strong>50 subsystems</strong> —{" "}
                <strong>200 evaluation areas</strong> across every system. The
                Snapshot tier covers 3 per system by design; your tier unlocks
                the rest.
              </>
            )}
          </div>

          {/* Per-system read-only grid */}
          {sortedParents.map((p) => {
            const list = childrenByParent.get(p.id) ?? [];
            const selectedInParent = list.filter((c) => effectiveSelected.has(c.code)).length;
            return (
              <div key={p.id} className={`${getSystemClass(p.code ?? p.name)} mb-3.5`}>
                <div className="mm-row mm-row--between mb-[7px]">
                  <div className="mm-row mm-gap-xs">
                    <div className="mm-sys-dot" />
                    <span className="text-[12.5px] font-semibold">{p.name}</span>
                  </div>
                  <span className={`text-[11.5px] ${faint}`}>{selectedInParent} of {list.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((c) => {
                    const chosen = effectiveSelected.has(c.code);
                    return (
                      <div key={c.id}
                        className={`select-none rounded-full border-[1.3px] px-3 py-1.5 text-[11.5px] ${
                          chosen
                            ? "border-[var(--sys-color)] bg-[var(--sys-color)] font-semibold text-[var(--mm-abyss)]"
                            : "border-[color-mix(in_srgb,var(--mm-on-dark)_25%,transparent)] bg-transparent text-[color-mix(in_srgb,var(--mm-on-dark)_75%,transparent)]"
                        }`}>
                        {c.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FrameworkExplainer;
