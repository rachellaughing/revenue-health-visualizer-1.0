import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getTopOpportunities,
  type TopOpportunities,
  type FeaturedCard,
  type OtherOpportunityGroup,
  type LockedSystem,
} from "@/lib/report.functions";
import {
  BADGE_LABELS,
  SEVERITY_LABELS,
  SECTION_COPY,
  QUESTION_LABELS,
} from "@/components/reports/opportunity-labels";

export const Route = createFileRoute("/reports/top-opportunities")({
  head: () => ({
    meta: [
      { title: "Top Opportunities — Revenue Health Visualiser™" },
      {
        name: "description",
        content:
          "See where to focus next across your revenue systems: the weaknesses with the widest knock-on effect and the improvements you can start now.",
      },
      { property: "og:title", content: "Top Opportunities — Revenue Health Visualiser™" },
      {
        property: "og:description",
        content:
          "Your prioritised revenue opportunities: widest impact first, practical improvements second.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const T = {
  abyss: "var(--mm-abyss)",
  paper: "var(--mm-paper)",
  offWhite: "var(--mm-off-white)",
  ember: "var(--mm-ember)",
  teal: "var(--mm-teal)",
  sand: "var(--mm-sand)",
  mid: "var(--mm-mid)",
  ink: "var(--mm-ink)",
  white: "var(--mm-white)",
  danger: "var(--mm-danger)",
};

const SEVERITY_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: "var(--mm-danger)", bg: "rgba(239,68,68,0.1)" },
  fragile: { color: "var(--mm-sand)", bg: "rgba(196,149,106,0.12)" },
  stable: { color: "var(--mm-teal)", bg: "rgba(42,107,110,0.10)" },
  strong: { color: "var(--mm-sys-authority)", bg: "rgba(43,180,87,0.1)" },
};

const LOCKED_BATCH = 10;

function Page() {
  const fetchFn = useServerFn(getTopOpportunities);
  const { data } = useQuery({
    queryKey: ["top-opportunities"],
    queryFn: () => fetchFn({ data: {} }),
  });

  if (!data) return <div style={{ minHeight: "100dvh", background: T.paper }} />;
  if ("error" in data) {
    return (
      <div style={{ minHeight: "100dvh", background: T.paper, padding: 40 }}>
        <p style={{ fontFamily: "Inter", color: T.mid }}>
          Complete a Health Check to see your Top Opportunities.
        </p>
      </div>
    );
  }

  return <PageBody payload={data as TopOpportunities} />;
}

function PageBody({ payload }: { payload: TopOpportunities }) {
  const isStarter = payload.tier === "starter";
  const [tab, setTab] = useState<"impact" | "quick">("impact");
  const [lockedShown, setLockedShown] = useState(LOCKED_BATCH);

  const cards = tab === "impact" ? payload.biggestImpact : payload.quickestWins;
  const intro =
    tab === "impact" ? SECTION_COPY.biggestImpactIntro : SECTION_COPY.quickestWinsIntro;

  return (
    <div
      style={{ minHeight: "100dvh", background: T.paper, fontFamily: "Inter, sans-serif" }}
    >
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 20px 80px" }}>
        <div
          style={{
            fontSize: 11,
            color: T.mid,
            marginBottom: 20,
            letterSpacing: "0.08em",
          }}
        >
          REVENUE HEALTH MATRIX™ &nbsp;›&nbsp; TOP OPPORTUNITIES
        </div>

        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 30,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            {isStarter ? SECTION_COPY.starterHeadline : "Top Opportunities"}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: T.mid,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            {isStarter
              ? SECTION_COPY.starterLede
              : `Based on all ${payload.evaluatedCount} evaluated Revenue Systems, here is where to focus next.`}
          </p>
        </header>

        {isStarter && (
          <section
            style={{
              background: T.white,
              border: "1px solid rgba(196,149,106,0.35)",
              borderRadius: 12,
              padding: "16px 18px",
              marginBottom: 22,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ maxWidth: 620 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: T.sand,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                {SECTION_COPY.scopeKicker}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                {SECTION_COPY.scopeBody}
              </p>
            </div>
            <div
              style={{
                background: T.offWhite,
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: T.abyss,
                whiteSpace: "nowrap",
              }}
            >
              {payload.evaluatedCount} / {payload.totalCount} systems evaluated
            </div>
          </section>
        )}

        {/* Tabs. Filter chips could sit in this row later. */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            borderBottom: `1px solid ${T.offWhite}`,
          }}
        >
          {(
            [
              ["impact", "Biggest Impact", payload.biggestImpact.length],
              ["quick", "Quickest Wins", payload.quickestWins.length],
            ] as const
          ).map(([key, label, count]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? T.ember : "transparent"}`,
                  padding: "10px 4px",
                  marginRight: 18,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? T.ink : T.mid,
                  cursor: "pointer",
                }}
              >
                {label}{" "}
                <span style={{ fontSize: 12, color: T.mid }}>({count})</span>
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 13, color: T.mid, lineHeight: 1.6, margin: "0 0 20px" }}>
          {intro}
        </p>

        {cards.length === 0 ? (
          <div
            style={{
              background: T.white,
              border: "1px solid var(--mm-rule)",
              borderRadius: 12,
              padding: "22px 20px",
              fontSize: 13,
              color: T.mid,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Nothing in your evaluated systems currently qualifies here. That is a result, not a
            gap in the report.
          </div>
        ) : (
          <div style={{ marginBottom: 36 }}>
            {cards.map((c) => (
              <OpportunityCard key={c.childSystemId} card={c} isQuickWin={tab === "quick"} />
            ))}
          </div>
        )}

        {payload.otherGroups.length > 0 && (
          <OtherOpportunities groups={payload.otherGroups} />
        )}

        {isStarter && payload.lockedSystems.length > 0 && (
          <LockedSection
            systems={payload.lockedSystems}
            tiles={payload.lockedTiles}
            shown={lockedShown}
            onShowMore={() => setLockedShown((n) => n + LOCKED_BATCH)}
          />
        )}

        <div
          style={{
            paddingTop: 24,
            marginTop: 32,
            borderTop: `1px solid ${T.offWhite}`,
            fontSize: 11,
            color: T.mid,
          }}
        >
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.mid,
          letterSpacing: "0.1em",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function OpportunityCard({ card, isQuickWin }: { card: FeaturedCard; isQuickWin: boolean }) {
  const color = card.parentColorHex || T.teal;
  const affectingLabel = isQuickWin
    ? QUESTION_LABELS.affectingQuickWin
    : QUESTION_LABELS.affectingImpact;

  return (
    <article
      style={{
        background: T.white,
        border: "1px solid var(--mm-rule)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
        padding: "20px 22px",
        marginBottom: 14,
        boxShadow: "0 2px 6px rgba(24,40,41,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>{card.name}</h2>
        <span style={{ fontSize: 11, color: T.mid }}>{card.parentName}</span>
        <span
          style={{
            marginLeft: "auto",
            padding: "3px 10px",
            borderRadius: 20,
            background: color + "18",
            color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {BADGE_LABELS[card.badgeKey]}
        </span>
      </div>

      <Block label={QUESTION_LABELS.whatWeSee}>
        <p style={{ fontSize: 14, color: T.ink, lineHeight: 1.6, margin: 0 }}>
          {card.whatWeSee}
        </p>
      </Block>

      <Block label={QUESTION_LABELS.whyItMatters}>
        <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.7, margin: 0 }}>
          {card.whyItMatters}
        </p>
      </Block>

      {card.affecting.length > 0 && (
        <Block label={affectingLabel}>
          <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, margin: 0 }}>
            {card.affecting.join(", ")}
          </p>
          {card.criticalPath && (
            <p style={{ fontSize: 12, color: T.mid, margin: "6px 0 0" }}>
              Critical Path: {card.criticalPath}
            </p>
          )}
        </Block>
      )}

      {card.startHere.length > 0 && (
        <div
          style={{
            background: T.offWhite,
            borderRadius: 10,
            padding: "14px 16px",
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.mid,
              letterSpacing: "0.1em",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            {QUESTION_LABELS.startHere}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {card.startHere.map((a, i) => (
              <li
                key={i}
                style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, marginBottom: 4 }}
              >
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function OtherOpportunities({ groups }: { groups: OtherOpportunityGroup[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: T.ink,
          margin: "0 0 4px",
        }}
      >
        Other opportunities
      </h2>
      <p style={{ fontSize: 13, color: T.mid, margin: "0 0 14px", lineHeight: 1.6 }}>
        The rest of your evaluated systems, grouped by Revenue System.
      </p>

      {groups.map((g) => {
        const isOpen = open === g.parentCode;
        return (
          <div
            key={g.parentCode}
            style={{
              background: T.white,
              border: "1px solid var(--mm-rule)",
              borderRadius: 10,
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : g.parentCode)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: g.parentColorHex,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                {g.parentName}
              </span>
              <span style={{ fontSize: 12, color: T.mid }}>({g.items.length})</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: T.mid,
                  transform: isOpen ? "rotate(180deg)" : "none",
                }}
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${T.offWhite}` }}>
                {g.items.map((it) => {
                  const s = SEVERITY_STYLE[it.severity];
                  return (
                    <div
                      key={it.childSystemId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        borderBottom: `1px solid ${T.offWhite}`,
                      }}
                    >
                      <span style={{ fontSize: 13, color: T.ink }}>{it.name}</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: s.bg,
                          color: s.color,
                          fontSize: 10,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {SEVERITY_LABELS[it.severity]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function LockedSection({
  systems,
  tiles,
  shown,
  onShowMore,
}: {
  systems: LockedSystem[];
  tiles: { parentCode: string; parentName: string; parentColorHex: string; count: number }[];
  shown: number;
  onShowMore: () => void;
}) {
  const visible = systems.slice(0, shown);

  return (
    <section
      style={{
        background: T.offWhite,
        border: "1px solid var(--mm-rule)",
        borderRadius: 14,
        padding: "24px 22px",
        marginBottom: 32,
      }}
    >
      <h2
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: T.ink,
          margin: "0 0 6px",
        }}
      >
        {SECTION_COPY.lockedHeading}
      </h2>
      <p style={{ fontSize: 13, color: T.mid, margin: "0 0 14px", lineHeight: 1.6 }}>
        {SECTION_COPY.lockedSubhead}
      </p>

      <div
        style={{
          background: T.white,
          border: "1px dashed rgba(0,0,0,0.18)",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 12,
          color: T.ink,
          lineHeight: 1.6,
          marginBottom: 18,
        }}
      >
        {SECTION_COPY.lockedBanner}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.parentCode}
            style={{
              background: T.white,
              border: "1px solid var(--mm-rule)",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: T.mid,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: t.parentColorHex,
                }}
              />
              {t.parentName}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.abyss }}>{t.count}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        {visible.map((s) => (
          <div
            key={s.childSystemId}
            style={{
              background: T.white,
              border: "1px solid var(--mm-rule)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                letterSpacing: "0.08em",
                color: T.mid,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: s.parentColorHex,
                }}
              />
              {s.parentName}
              <span style={{ marginLeft: "auto" }} aria-hidden="true">
                🔒
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
              {s.name}
            </div>
            <p style={{ fontSize: 12, color: T.mid, lineHeight: 1.6, margin: "0 0 8px" }}>
              {s.governs}
            </p>
            {/* Slot: optional "what can happen when this is weak" line goes here. */}
            <div style={{ fontSize: 11, color: T.mid, fontStyle: "italic" }}>
              {SECTION_COPY.lockedNotIncluded}
            </div>
          </div>
        ))}
      </div>

      {visible.length < systems.length && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={onShowMore}
            style={{
              background: "transparent",
              border: `1px solid ${T.mid}`,
              color: T.abyss,
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Show more ({systems.length - visible.length} remaining)
          </button>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link
          to="/settings/billing"
          style={{
            display: "inline-block",
            background: T.ember,
            color: T.white,
            borderRadius: 8,
            padding: "11px 24px",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {SECTION_COPY.lockedCta}
        </Link>
      </div>
    </section>
  );
}
