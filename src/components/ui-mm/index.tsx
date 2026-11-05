import type { CSSProperties, ReactNode, ElementType, HTMLAttributes } from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

/** Single-custom-property style helper: the only allowed inline style. */
const vars = (v: Record<string, string | number>) => v as CSSProperties;

type Base = { className?: string; children?: ReactNode } & Omit<HTMLAttributes<HTMLElement>, "className" | "children" | "style">;

export function Card({ variant, as: Tag = "div", className, children, ...rest }: Base & {
  variant?: "raised" | "sunken" | "dark" | "ember" | "glass"; as?: ElementType;
}) {
  return <Tag className={cx("mm-card", variant && `mm-card--${variant}`, className)} {...rest}>{children}</Tag>;
}

export function SectionLabel({ className, children }: Base) {
  return <div className={cx("mm-section-label", className)}>{children}</div>;
}

export function Badge({ tone = "neutral", className, children }: Base & {
  tone?: "neutral" | "sand" | "success" | "warning" | "error" | "info" | "solid-dark";
}) {
  return <span className={cx("mm-badge", `mm-badge--${tone}`, className)}>{children}</span>;
}

/** pct 0–100. color accepts any CSS color/var; omit to inherit --sys-color via a mm-sys-- class. */
export function ScoreRing({ pct, size = 64, color, label, className }: {
  pct: number; size?: number; color?: string; label?: ReactNode; className?: string;
}) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className={cx("mm-score-ring", className)}
      style={vars({ "--pct": p, "--size": `${size}px`, ...(color ? { "--color": color } : {}) })}
      role="img" aria-label={`Score ${Math.round(p)} of 100`}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle className="mm-score-ring__track" cx="18" cy="18" r="15.915" strokeWidth="3" />
        <circle className="mm-score-ring__fill" cx="18" cy="18" r="15.915" strokeWidth="3" pathLength={100} />
      </svg>
      <div className="mm-score-ring__label">{label ?? Math.round(p)}</div>
    </div>
  );
}

export function Bar({ pct, className, label }: { pct: number; className?: string; label?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className={cx("mm-bar", className)} style={vars({ "--pct": p })}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label={label}>
      <div className="mm-bar__fill" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("mm-skeleton", className)} aria-hidden />;
}

export function PageShell({ narrow, className, children, before }: Base & { narrow?: boolean; before?: ReactNode }) {
  return (
    <div className="mm-page-bg">
      {before}
      <main className={cx("mm-page", narrow && "mm-page--narrow", className)}>{children}</main>
    </div>
  );
}

export function TopBar({ className, children }: Base) {
  return <header className={cx("mm-topbar", className)}>{children}</header>;
}
