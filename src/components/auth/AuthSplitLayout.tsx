import type { ReactNode } from "react";
import rhLogoLight from "@/assets/rh-logo-light.svg.asset.json";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mm-auth-split">
      <LeftPanel />
      <div className="mm-auth-split__right">
        <div className="mm-auth-box">
          {children}
          <div className="mm-auth-split__credit">
            <a href="https://marketplacemaven.com" target="_blank" rel="noopener noreferrer">
              A Marketplace Maven product
            </a>
            <span aria-hidden className="mm-dot-ember" />
          </div>
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { n: "5", l: "Systems" },
  { n: "50", l: "Subsystems" },
  { n: "200", l: "Questions" },
];

function LeftPanel() {
  return (
    <div className="mm-auth-brand">
      <TreeBackground />

      {/* Top spacer */}
      <div />

      <div className="mm-auth-brand__center">
        <img src={rhLogoLight.url} alt="Revenue Health Visualizer™" className="mm-auth-brand__logo" />

        <h2 className="mm-auth-brand__headline">
          A prompt didn't create this.
          <br />
          Neither did a quiz.
        </h2>

        <p className="mm-auth-brand__body">
          After years of watching the same patterns surface inside founder-led companies — the same invisible friction, the same structural gaps disguised as execution problems — this framework was built to expose what you can't see from the inside.
        </p>

        <blockquote className="mm-auth-brand__quote">
          Like smell blindness — you don't notice what's been there all along until someone else points it out.
        </blockquote>

        <p className="mm-auth-brand__aside">The methodology wasn't generated. It was built.</p>

        <div className="mm-auth-brand__stats">
          {STATS.map((s, i) => (
            <div key={s.l} className="mm-auth-brand__stat">
              {i > 0 && <div className="mm-auth-brand__stat-sep" />}
              <div>
                <div className="mm-auth-brand__stat-n">{s.n}</div>
                <div className="mm-auth-brand__stat-l">{s.l}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mm-auth-brand__cta">Start with the Snapshot — 3 subsystems, right now.</p>
      </div>

      <div className="mm-auth-brand__footer">© 2026 Marketplace Maven. All rights reserved.</div>
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
      className="mm-auth-brand__tree"
    >
      <g fill="none" strokeLinecap="round">
        {/* Root node */}
        <rect x={rootX - 150} y={rootY - 22} width={300} height={44} rx={22} strokeWidth={1.4} />
        <text
          x={rootX}
          y={rootY + 5}
          textAnchor="middle"
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
