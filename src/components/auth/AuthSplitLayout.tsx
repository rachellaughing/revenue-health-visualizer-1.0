import type { ReactNode } from "react";
import rhLogoLight from "@/assets/rh-logo-light.svg.asset.json";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      <LeftPanel />
      <div
        className="flex min-h-screen items-center justify-center px-4 py-12 relative"
        style={{ backgroundColor: "#F9F6F1" }}
      >
        <div className="w-full max-w-md">
          {children}
          <div className="mt-10 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--mm-mid)" }}>
            <a
              href="https://marketplacemaven.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--mm-mid)" }}
            >
              A Marketplace Maven product
            </a>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: "var(--mm-ember)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftPanel() {
  return (
    <div
      className="relative hidden lg:flex flex-col justify-between overflow-hidden px-12 py-10"
      style={{ backgroundColor: "#1C2B2B", minHeight: "100vh" }}
    >
      <TreeBackground />

      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="relative z-10 w-full" style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 24 }}>
          <img
            src={rhLogoLight.url}
            alt="Revenue Health Visualiser™"
            style={{ width: 260, maxWidth: "100%", height: "auto", display: "block" }}
          />
        </div>

        <h2
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "italic",
            fontSize: 44,
            lineHeight: 1.08,
            color: "#FFFFFF",
            margin: 0,
            fontWeight: 400,
          }}
        >
          A prompt didn't create this.
          <br />
          Neither did a quiz.
        </h2>

        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 14,
            lineHeight: 1.6,
            marginTop: 22,
          }}
        >
          After years of watching the same patterns surface inside founder-led companies — the same invisible friction, the same structural gaps disguised as execution problems — this framework was built to expose what you can't see from the inside.
        </p>

        <blockquote
          style={{
            borderLeft: "2px solid #F05223",
            background: "rgba(255,255,255,0.04)",
            padding: "14px 18px",
            margin: "22px 0",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#FFFFFF",
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          Like smell blindness — you don't notice what's been there all along until someone else points it out.
        </blockquote>

        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            fontStyle: "italic",
            margin: 0,
          }}
        >
          The methodology wasn't generated. It was built.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 18,
            marginTop: 28,
            paddingTop: 22,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {[
            { n: "5", l: "Systems" },
            { n: "50", l: "Subsystems" },
            { n: "200", l: "Questions" },
          ].map((s, i) => (
            <div key={s.l} style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
              {i > 0 && (
                <div
                  style={{
                    width: 1,
                    height: 36,
                    backgroundColor: "rgba(255,255,255,0.15)",
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: 36,
                    lineHeight: 1,
                    color: "#FFFFFF",
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    marginTop: 6,
                  }}
                >
                  {s.l}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 12,
            fontStyle: "italic",
            marginTop: 18,
          }}
        >
          Start with the Snapshot — 3 subsystems, right now.
        </p>
      </div>

      {/* Footer */}
      <div
        className="relative z-10"
        style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}
      >
        © 2026 Marketplace Maven. All rights reserved.
      </div>
    </div>
  );
}

function TreeBackground() {
  // Layout: root at top-center, 5 systems below, 3 subsystems each, dotted continuations.
  const systems = ["Positioning", "Authority", "Conversion", "Lifecycle", "Visibility"];
  const w = 1100;
  const h = 900;
  const rootX = w / 2;
  const rootY = 90;
  const sysY = 340;
  const subY = 560;
  const subDotY = 700;
  const sysGap = w / (systems.length + 1);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.07,
        pointerEvents: "none",
      }}
    >
      <g fill="none" stroke="#FFFFFF" strokeLinecap="round">
        {/* Root node */}
        <rect x={rootX - 150} y={rootY - 22} width={300} height={44} rx={22} strokeWidth={1.4} />
        <text
          x={rootX}
          y={rootY + 5}
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="Inter, sans-serif"
          fontSize={14}
          stroke="none"
        >
          Revenue Health Matrix™
        </text>

        {systems.map((name, i) => {
          const sx = sysGap * (i + 1);
          return (
            <g key={name}>
              {/* root to system */}
              <path d={`M ${rootX} ${rootY + 22} C ${rootX} ${sysY - 60}, ${sx} ${sysY - 100}, ${sx} ${sysY - 22}`} strokeWidth={1.3} />
              {/* system node */}
              <rect x={sx - 80} y={sysY - 22} width={160} height={44} rx={22} strokeWidth={1.2} />
              <text
                x={sx}
                y={sysY + 5}
                textAnchor="middle"
                fill="#FFFFFF"
                fontFamily="Inter, sans-serif"
                fontSize={13}
                stroke="none"
              >
                {name}
              </text>

              {/* 3 subsystems */}
              {[-1, 0, 1].map((k) => {
                const cx = sx + k * 60;
                return (
                  <g key={k}>
                    <path d={`M ${sx} ${sysY + 22} L ${cx} ${subY - 18}`} strokeWidth={0.9} />
                    <circle cx={cx} cy={subY} r={14} strokeWidth={0.8} />
                    {/* dotted continuation */}
                    <path
                      d={`M ${cx} ${subY + 14} L ${cx} ${subDotY}`}
                      strokeWidth={0.8}
                      strokeDasharray="2 4"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
