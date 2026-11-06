import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Area, ChildSystem, ParentSystem } from "@/lib/healthcheck.functions";
import { getSystemColor } from "@/lib/system-colors";
import { isAreaDone, type Step } from "@/lib/health-check-progress";

export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--mm-teal)]";

type Answer = { health: number | null; tracking: number | null };
type FocusStep = Step<ParentSystem, ChildSystem, Area>;

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mql.matches);
    on();
    mql.addEventListener?.("change", on);
    return () => mql.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export function FocusMode({
  steps,
  index,
  onIndexChange,
  responses,
  healthLabels,
  trackingLabels,
  onHealth,
  onTracking,
  isMobile,
}: {
  steps: FocusStep[];
  index: number;
  onIndexChange: (i: number) => void;
  responses: Record<string, Answer>;
  healthLabels: string[];
  trackingLabels: string[];
  onHealth: (area: Area, value: number | null) => void;
  onTracking: (area: Area, value: number) => void;
  isMobile: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = steps[index];
  const r: Answer | undefined = step ? responses[step.area.question_id] : undefined;
  const done = isAreaDone(r);
  const healthChosen = !!r && r.health !== null && r.health > 0;
  const isSkipped = !!r && r.health === null;
  const isLast = index >= steps.length - 1;
  const allDone = steps.length > 0 && steps.every((s) => isAreaDone(responses[s.area.question_id]));

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);
  // Cancel any pending auto-advance when the person navigates themselves.
  useEffect(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, [index]);

  function scheduleAdvance() {
    if (isLast) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const target = index + 1;
    advanceTimer.current = setTimeout(() => onIndexChange(target), reducedMotion ? 0 : 350);
  }

  function chooseHealth(v: number) {
    if (!step) return;
    onHealth(step.area, v);
  }
  function chooseTracking(v: number) {
    if (!step || !healthChosen) return;
    onTracking(step.area, v);
    scheduleAdvance();
  }
  function skip() {
    if (!step) return;
    onHealth(step.area, null);
    scheduleAdvance();
  }
  function goBack() {
    if (index > 0) onIndexChange(index - 1);
  }
  function goNext() {
    if (done && !isLast) onIndexChange(index + 1);
  }

  // Keyboard shortcuts
  const handlers = useRef({ chooseHealth, chooseTracking, skip, goBack, goNext, healthChosen });
  handlers.current = { chooseHealth, chooseTracking, skip, goBack, goNext, healthChosen };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      }
      const h = handlers.current;
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const v = Number(e.key);
        if (h.healthChosen) h.chooseTracking(v);
        else h.chooseHealth(v);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        h.skip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        h.goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        h.goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!step) {
    return (
      <div className="rounded-xl border border-border bg-[var(--mm-off-white)] p-6 text-sm text-[var(--mm-mid)]">
        Choose the subsystems you want to evaluate above, and their questions will appear here one at a time.
      </div>
    );
  }

  const color = getSystemColor(step.parent.code ?? step.parent.name);
  const systemSteps = steps.filter((s) => s.parent.id === step.parent.id);
  const posInSystem = systemSteps.findIndex((s) => s.area.id === step.area.id) + 1;
  const systemName = step.parent.name;

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {`Question ${posInSystem} of ${systemSteps.length} in ${systemName}`}
      </p>

      <div className="mm-fm-card" style={{ "--sys-color": color } as CSSProperties}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--mm-mid)]">
          {systemName} · {step.child.name}
        </div>
        <div className="mb-3 text-xs font-semibold text-[var(--mm-ink)]">{step.area.name}</div>
        <p className="mm-fm-question mb-3 text-lg leading-relaxed text-[var(--mm-ink)] md:text-xl">
          {step.area.question_text}
        </p>
        {step.area.helper_text && (
          <div className="mb-5 border-l-2 border-border pl-3 text-[13px] leading-relaxed text-[var(--mm-mid)]">
            {step.area.helper_text}
          </div>
        )}

        <div
          role="group"
          aria-label="How much do you agree?"
          className="grid grid-cols-1 gap-2 sm:grid-cols-5"
        >
          {healthLabels.map((label, i) => {
            const val = i + 1;
            const sel = r?.health === val;
            return (
              <button
                key={val}
                type="button"
                aria-pressed={sel}
                onClick={() => chooseHealth(val)}
                className={`mm-fm-opt ${sel ? "mm-fm-opt--sel" : ""} min-h-[44px] rounded-lg px-3 py-2 text-[13px] leading-tight text-[var(--mm-ink)] transition-colors motion-reduce:transition-none ${FOCUS_RING}`}
              >
                {!isMobile && <span className="mr-1 text-[11px] text-[var(--mm-mid)]">{val}</span>}
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={skip}
          className={`mm-fm-skip ${isSkipped ? "mm-fm-skip--on" : ""} mt-2 min-h-[44px] rounded px-1 text-xs underline ${FOCUS_RING}`}
        >
          {isSkipped ? "Skipped" : "Not sure, skip for now"}
        </button>

        {healthChosen && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-3 text-[13px] font-semibold text-[var(--mm-ink)]">
              How is this tracked in your business?
            </div>
            <div className="flex flex-col gap-2">
              {trackingLabels.map((label, i) => {
                const val = i + 1;
                const sel = r?.tracking === val;
                return (
                  <label
                    key={val}
                    className={`mm-fm-track ${sel ? "mm-fm-track--sel" : ""} flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] text-[var(--mm-ink)] focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--mm-teal)]`}
                  >
                    <input
                      type="radio"
                      name={`focus-track-${step.area.id}`}
                      checked={sel}
                      onChange={() => chooseTracking(val)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            className={`min-h-[44px] rounded-lg border border-border bg-[var(--mm-paper)] px-4 text-sm text-[var(--mm-ink)] disabled:opacity-40 ${FOCUS_RING}`}
          >
            Back
          </button>
          <span className="text-xs text-[var(--mm-mid)]">
            {index + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!done || isLast}
            className={`min-h-[44px] rounded-lg border border-border bg-[var(--mm-paper)] px-4 text-sm text-[var(--mm-ink)] disabled:opacity-40 ${FOCUS_RING}`}
          >
            Next
          </button>
        </div>

        {!isMobile && (
          <p className="mt-3 text-center text-[11px] text-[var(--mm-mid)]">Press 1-5 to answer, S to skip</p>
        )}
      </div>

      {isLast && allDone && (
        <div className="mt-4 rounded-lg border border-border bg-[var(--mm-off-white)] p-4 text-sm text-[var(--mm-ink)]" role="status">
          You have reached the last question. Your answers are saving; your completion status will appear above.
        </div>
      )}
    </div>
  );
}
