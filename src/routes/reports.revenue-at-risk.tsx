import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getRevenueAtRisk,
  updateCompanyMetrics,
  type RevenueAtRisk,
  type RiskItemFull,
} from "@/lib/report.functions";

export const Route = createFileRoute("/reports/revenue-at-risk")({
  head: () => ({ meta: [{ title: "Revenue at Risk — Revenue Health Visualiser" }] }),
  component: Page,
});

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  teal: "#2A6B6E",
  sand: "#C4956A",
  mid: "#888880",
  ink: "#111111",
  white: "#FFFFFF",
  sys: { POS: "#3B82F6", AUTH: "#10B981", CONV: "#F05223", LFC: "#8B5CF6", VIS: "#F59E0B" } as Record<string, string>,
  risk: { critical: "#EF4444", high: "#F97316", moderate: "#C4956A", low: "#10B981" },
};

const ARR_MIDPOINTS: Record<string, number> = {
  "<$500K": 250000, "$500K–$1M": 750000, "$1M–$2M": 1500000,
  "$2M–$5M": 3500000, "$5M–$10M": 7500000, "$10M+": 12000000,
};
const CHURN_MIDPOINTS: Record<string, number> = {
  "Very Low (<5%)": 0.03, "Low (5–10%)": 0.075,
  "Moderate (10–20%)": 0.15, "High (20%+)": 0.25,
};
const CLOSE_RATE_MIDPOINTS: Record<string, number> = {
  "<10%": 0.07, "10–20%": 0.15, "20–35%": 0.275,
  "35–50%": 0.425, "50%+": 0.55,
};

type Company = RevenueAtRisk["company"];

function calcExposure(item: RiskItemFull, c: Company): { amount: number | null; basis: string } {
  const arr = (c.annual_revenue && ARR_MIDPOINTS[c.annual_revenue]) || 1500000;
  const churn = (c.annual_churn && CHURN_MIDPOINTS[c.annual_churn]) || 0.075;
  const closeRate = (c.avg_close_rate && CLOSE_RATE_MIDPOINTS[c.avg_close_rate]) || 0.15;
  const acv = c.acv || 1267;
  const cac = c.cac || 214;
  const healthGap = (100 - item.healthScore) / 100;

  switch (item.riskCategory) {
    case "churn":
      return { amount: Math.round(arr * churn), basis: `$${(arr/1000000).toFixed(1)}M ARR × ${(churn*100).toFixed(1)}% churn rate` };
    case "expansion":
      return { amount: Math.round(arr * 0.15 * healthGap), basis: `$${(arr/1000000).toFixed(1)}M ARR × 15% expansion potential × health gap` };
    case "visibility":
      return { amount: Math.round(arr * 0.08), basis: `$${(arr/1000000).toFixed(1)}M ARR × 8% planning error factor` };
    case "conversion": {
      const potentialCloseRate = Math.min(closeRate + 0.1, 0.65);
      const dealVolume = Math.round(arr / acv / 4);
      return {
        amount: Math.round(dealVolume * acv * (potentialCloseRate - closeRate)),
        basis: `${dealVolume} deals/qtr × $${acv.toLocaleString()} ACV × ${((potentialCloseRate - closeRate)*100).toFixed(0)}% close rate gap`,
      };
    }
    case "acquisition": {
      const dealsPerYear = Math.round(arr / acv);
      return {
        amount: Math.round(dealsPerYear * 0.2 * cac),
        basis: `${Math.round(dealsPerYear * 0.2)} poor-fit customers × $${cac.toLocaleString()} CAC`,
      };
    }
    default:
      return { amount: null, basis: "" };
  }
}

function riskLevel(healthScore: number, visibilityGap: number) {
  if (healthScore < 40) return { label: "Critical", color: T.risk.critical, bg: "rgba(239,68,68,0.1)" };
  if (healthScore < 50 || visibilityGap > 25) return { label: "High", color: T.risk.high, bg: "rgba(249,115,22,0.1)" };
  if (healthScore < 65) return { label: "Moderate", color: T.sand, bg: "rgba(196,149,106,0.12)" };
  return { label: "Low", color: T.risk.low, bg: "rgba(16,185,129,0.1)" };
}

function fmtMoney(n: number) {
  if (n >= 1000000) return `~$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `~$${Math.round(n/1000)}K`;
  return `~$${n.toLocaleString()}`;
}

function Page() {
  const fetchFn = useServerFn(getRevenueAtRisk);
  const { data } = useQuery({
    queryKey: ["revenue-at-risk"],
    queryFn: () => fetchFn({ data: {} }),
  });

  if (!data) return <div style={{ minHeight: "100vh", background: T.paper }} />;
  if ("error" in data) {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, padding: 40 }}>
        <p style={{ fontFamily: "Inter", color: T.mid }}>
          Complete a Health Check to see your Revenue at Risk.
        </p>
      </div>
    );
  }

  return <Body payload={data as RevenueAtRisk} />;
}

function Body({ payload }: { payload: RevenueAtRisk }) {
  const isStarter = payload.tier === "starter";
  const selectedSet = useMemo(() => new Set(payload.selectedChildIds), [payload.selectedChildIds]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    // Sort by exposure desc; starter: assessed-first
    const withExp = payload.items.map((it) => ({ it, exposure: calcExposure(it, payload.company).amount ?? 0 }));
    withExp.sort((a, b) => b.exposure - a.exposure);
    if (!isStarter) return withExp.map((x) => x.it);
    return withExp
      .sort((a, b) => {
        const aA = selectedSet.has(a.it.childSystemId);
        const bA = selectedSet.has(b.it.childSystemId);
        if (aA && !bA) return -1;
        if (!aA && bA) return 1;
        return b.exposure - a.exposure;
      })
      .map((x) => x.it);
  }, [payload.items, payload.company, isStarter, selectedSet]);

  const defaultOpen = useMemo(() => {
    const first = sorted.find((o) => (isStarter ? selectedSet.has(o.childSystemId) : true));
    return first?.code ?? null;
  }, [sorted, isStarter, selectedSet]);
  const effectiveExpanded = expandedId === null ? defaultOpen : expandedId;

  const assessedCount = payload.items.filter((it) => selectedSet.has(it.childSystemId)).length;

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: "Inter, sans-serif" }}>
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 40px 80px" }}>
        <div style={{ fontSize: 11, color: T.mid, marginBottom: 20, letterSpacing: "0.08em" }}>
          REVENUE HEALTH MATRIX™ &nbsp;›&nbsp; REVENUE AT RISK
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>
            Revenue at Risk
          </h1>
          <p style={{ fontSize: 14, color: T.mid, margin: 0, lineHeight: 1.6, maxWidth: 600 }}>
            Systems that are actively costing you revenue today — through churn, conversion loss,
            poor-fit acquisition, or invisible planning gaps. Ranked by estimated financial exposure.
          </p>
        </div>

        <MissingMetricsCard company={payload.company} />

        <div style={{
          background: "rgba(196,149,106,0.08)", border: "1px solid rgba(196,149,106,0.25)",
          borderRadius: 10, padding: "12px 18px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 12, color: T.mid, lineHeight: 1.65 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>About these estimates: </span>
            Financial exposure figures are directional estimates based on your self-reported Health
            Check scores and the business metrics you provided during setup (ARR, ACV, CAC, close
            rate, churn). They are not financial projections and should not be used for reporting or
            forecasting. Their purpose is to illustrate the relative scale of revenue exposure in
            each risk area — not to calculate actual losses.
          </div>
        </div>

        <div style={{
          background: "rgba(196,149,106,0.06)", border: "1px solid rgba(196,149,106,0.2)",
          borderRadius: 10, padding: "10px 16px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🔍</span>
          <div style={{ fontSize: 12, color: T.mid, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: T.ink }}>Self-assessment reminder: </span>
            These risk rankings reflect your current perception. Systems with large visibility gaps
            may be more fragile — and more expensive — than they appear.{" "}
            <a href="https://marketplacemaven.com/founder-blindspots" target="_blank" rel="noopener noreferrer"
              style={{ color: T.teal, fontWeight: 500 }}>Read about founder blind spots →</a>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {sorted.map((item, i) => {
            const isLocked = isStarter && !selectedSet.has(item.childSystemId);
            return (
              <RiskCard
                key={item.childSystemId}
                item={item}
                rank={i + 1}
                company={payload.company}
                expanded={effectiveExpanded === item.code && !isLocked}
                onToggle={() => setExpandedId(effectiveExpanded === item.code ? "__none__" : item.code)}
                isLocked={isLocked}
              />
            );
          })}

          {isStarter && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 180,
              background: `linear-gradient(to bottom, transparent, ${T.paper}ee, ${T.paper})`,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              paddingBottom: 20, pointerEvents: "none",
            }}>
              <div style={{ pointerEvents: "all", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: T.mid, marginBottom: 10 }}>
                  Showing risk areas for {assessedCount} of {payload.items.length} flagged subsystems
                </p>
                <button style={{
                  background: T.ember, color: T.white, border: "none",
                  borderRadius: 8, padding: "10px 22px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Upgrade to see full risk picture →
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ paddingTop: 24, marginTop: 32, borderTop: `1px solid ${T.offWhite}`, fontSize: 11, color: T.mid }}>
          © 2025 Marketplace Maven. All rights reserved.
        </div>
      </main>
    </div>
  );
}

function MissingMetricsCard({ company }: { company: Company }) {
  const missing: string[] = [];
  if (!company.annual_revenue) missing.push("annual_revenue");
  if (!company.acv) missing.push("acv");
  if (!company.avg_close_rate) missing.push("avg_close_rate");
  if (!company.annual_churn) missing.push("annual_churn");
  if (!company.cac) missing.push("cac");

  const qc = useQueryClient();
  const saveFn = useServerFn(updateCompanyMetrics);
  const [form, setForm] = useState<Record<string, string>>({
    annual_revenue: company.annual_revenue ?? "",
    acv: company.acv ? String(company.acv) : "",
    avg_close_rate: company.avg_close_rate ?? "",
    annual_churn: company.annual_churn ?? "",
    cac: company.cac ? String(company.cac) : "",
  });
  const [saving, setSaving] = useState(false);

  if (missing.length === 0) return null;

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      for (const k of missing) {
        const v = form[k];
        if (!v) continue;
        if (k === "acv" || k === "cac") payload[k] = Number(v);
        else payload[k] = v;
      }
      await saveFn({ data: payload });
      await qc.invalidateQueries({ queryKey: ["revenue-at-risk"] });
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.mid, marginBottom: 6, letterSpacing: "0.06em" } as const;
  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid transparent", background: T.offWhite, fontFamily: "Inter", fontSize: 13, color: T.ink, outline: "none", boxSizing: "border-box" } as const;

  return (
    <div style={{
      background: T.white, border: `1px solid rgba(240,82,35,0.2)`,
      borderRadius: 12, padding: 24, marginBottom: 24,
      boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>📊</span>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>
            Add your revenue metrics to see financial exposure estimates
          </h3>
          <p style={{ fontSize: 12, color: T.mid, margin: 0, lineHeight: 1.5 }}>
            We need a few numbers from your business. These are saved to your Company Profile.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 18 }}>
        {missing.includes("annual_revenue") && (
          <div>
            <div style={labelStyle}>ANNUAL REVENUE</div>
            <select value={form.annual_revenue} onChange={(e) => setForm((f) => ({ ...f, annual_revenue: e.target.value }))} style={inputStyle}>
              <option value="">Select range...</option>
              {Object.keys(ARR_MIDPOINTS).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
        {missing.includes("acv") && (
          <div>
            <div style={labelStyle}>AVERAGE CONTRACT VALUE (ACV)</div>
            <input type="number" value={form.acv} onChange={(e) => setForm((f) => ({ ...f, acv: e.target.value }))} placeholder="e.g. 12000" style={inputStyle} />
          </div>
        )}
        {missing.includes("avg_close_rate") && (
          <div>
            <div style={labelStyle}>AVERAGE CLOSE RATE</div>
            <select value={form.avg_close_rate} onChange={(e) => setForm((f) => ({ ...f, avg_close_rate: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {Object.keys(CLOSE_RATE_MIDPOINTS).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
        {missing.includes("annual_churn") && (
          <div>
            <div style={labelStyle}>ANNUAL CUSTOMER CHURN</div>
            <select value={form.annual_churn} onChange={(e) => setForm((f) => ({ ...f, annual_churn: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {Object.keys(CHURN_MIDPOINTS).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
        {missing.includes("cac") && (
          <div>
            <div style={labelStyle}>CUSTOMER ACQUISITION COST (CAC)</div>
            <input type="number" value={form.cac} onChange={(e) => setForm((f) => ({ ...f, cac: e.target.value }))} placeholder="e.g. 3500" style={inputStyle} />
          </div>
        )}
      </div>

      <button onClick={onSave} disabled={saving} style={{
        background: T.ember, color: T.white, border: "none",
        borderRadius: 8, padding: "10px 22px",
        fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
      }}>
        {saving ? "Saving…" : "Save & Calculate Exposure →"}
      </button>
    </div>
  );
}

function RiskCard({
  item, rank, company, expanded, onToggle, isLocked,
}: {
  item: RiskItemFull;
  rank: number;
  company: Company;
  expanded: boolean;
  onToggle: () => void;
  isLocked: boolean;
}) {
  const color = T.sys[item.parentCode] ?? item.parentColorHex;
  const exposure = calcExposure(item, company);
  const risk = riskLevel(item.healthScore, item.visibilityGap);

  return (
    <div style={{
      background: T.white,
      border: `1px solid ${expanded ? color + "40" : "rgba(0,0,0,0.07)"}`,
      borderRadius: 12, marginBottom: 12, overflow: "hidden",
      boxShadow: expanded ? `0 4px 16px ${color}12` : "0 2px 6px rgba(24,40,41,0.04)",
      filter: isLocked ? "blur(3px)" : "none",
      userSelect: isLocked ? "none" : "auto",
      opacity: isLocked ? 0.7 : 1,
    }}>
      <button onClick={!isLocked ? onToggle : undefined} style={{
        width: "100%", display: "grid",
        gridTemplateColumns: "44px 1fr auto auto auto auto",
        alignItems: "center", gap: 16, padding: "16px 20px",
        background: expanded ? color + "06" : "transparent",
        border: "none", cursor: isLocked ? "not-allowed" : "pointer",
        textAlign: "left", borderBottom: expanded ? `1px solid ${T.offWhite}` : "none",
        fontFamily: "Inter",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: expanded ? color : T.offWhite,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: expanded ? T.white : T.mid }}>{rank}</span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{item.name}</span>
            <span style={{ fontSize: 11, color: T.mid }}>{item.parentName}</span>
          </div>
          {!expanded && item.symptom && (
            <p style={{ fontSize: 11, color: T.mid, margin: 0, lineHeight: 1.4 }}>
              {item.symptom.length > 75 ? item.symptom.substring(0, 75) + "…" : item.symptom}
            </p>
          )}
        </div>

        <div style={{
          padding: "3px 10px", borderRadius: 20,
          background: risk.bg, color: risk.color,
          fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
        }}>
          {risk.label} Risk
        </div>

        <div style={{ textAlign: "right", minWidth: 80 }}>
          {exposure.amount ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: risk.color }}>
                {fmtMoney(exposure.amount)}
              </div>
              <div style={{ fontSize: 9, color: T.mid, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {item.riskLabel.toUpperCase()}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: T.mid, fontStyle: "italic" }}>Add metrics</div>
          )}
        </div>

        <div style={{ textAlign: "center", minWidth: 40 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{item.healthScore}</div>
          <div style={{ fontSize: 9, color: T.mid, letterSpacing: "0.06em" }}>HEALTH</div>
        </div>

        <span style={{
          fontSize: 12, color: T.mid,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", display: "inline-block",
        }}>▾</span>
      </button>

      {expanded && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 8 }}>
                WHAT'S AT RISK
              </div>
              <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.65, margin: 0 }}>
                {item.symptom || "—"}
              </p>
            </div>

            <div style={{
              background: risk.bg,
              border: `1px solid ${risk.color}25`,
              borderRadius: 10, padding: "16px 18px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, letterSpacing: "0.1em", marginBottom: 8 }}>
                ESTIMATED FINANCIAL EXPOSURE
              </div>
              {exposure.amount ? (
                <>
                  <div style={{ fontSize: 28, fontFamily: "'Instrument Serif', Georgia, serif", color: risk.color, marginBottom: 4 }}>
                    {fmtMoney(exposure.amount)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.mid, marginBottom: 6 }}>
                    {item.financialDriverLabel}
                  </div>
                  <div style={{
                    fontSize: 10, color: T.mid,
                    background: "rgba(255,255,255,0.6)", borderRadius: 6,
                    padding: "5px 8px", display: "inline-block",
                  }}>
                    {exposure.basis}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: T.mid, fontStyle: "italic", margin: 0 }}>
                  Add revenue metrics above to see estimates
                </p>
              )}
            </div>
          </div>

          <div style={{
            background: T.offWhite, borderRadius: 8, padding: "10px 14px",
            fontSize: 11, color: T.mid, lineHeight: 1.6, marginBottom: 16,
          }}>
            <span style={{ fontWeight: 600, color: T.ink }}>Estimate note: </span>
            This figure is directional — calculated from your self-reported Health Check scores and
            the business metrics you provided. It is not a financial projection and should not be
            used for reporting or forecasting. Its purpose is to illustrate the relative scale of
            exposure in this area.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <a href="/reports/revenue-system-health" style={{
              background: "transparent", border: `1px solid ${color}`,
              color, borderRadius: 8, padding: "7px 14px",
              fontSize: 11, fontWeight: 500, cursor: "pointer", textDecoration: "none",
            }}>
              View in Revenue System Health →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
