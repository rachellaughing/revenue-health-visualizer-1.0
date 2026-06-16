import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDashboardData } from "@/lib/dashboard.functions";
import { getPersonalProfile, getCompanyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/diagnostic")({
  head: () => ({ meta: [{ title: "Revenue Health Diagnostic™ — Book a Discovery Call" }] }),
  component: DiagnosticPage,
});

const T = {
  abyss: "#182829",
  hero: "#1C2B2B",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  ink: "#111111",
  mid: "#888880",
  white: "#FFFFFF",
};

const REPORT_COLORS = {
  history: "#F05223",
  team: "#2BB457",
  founder: "#223F99",
  shadow: "#DE1A58",
  roadmap: "#05A4A3",
};

const WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/srok4ARuusOq59OlGRRs/webhook-trigger/3794cbdf-5a0c-4c0b-aa46-2ba67918fff6";

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "Not yet assessed";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Stable";
  if (score >= 45) return "Fragile";
  return "Critical";
}

function Eyebrow({ children, color = T.ember }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color,
        marginBottom: 16,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function scrollToForm() {
  const el = document.getElementById("discovery-form");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function DiagnosticPage() {
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardData(), staleTime: 30_000 });
  const { data: personal } = useQuery({ queryKey: ["profile", "personal"], queryFn: () => getPersonalProfile() });
  const { data: company } = useQuery({ queryKey: ["profile", "company"], queryFn: () => getCompanyProfile() });

  const firstName = dash?.profile?.first_name ?? personal?.first_name ?? "";
  const email = (personal as any)?.email ?? "";
  const overallScore = dash?.overallScore ?? null;
  const label = scoreLabel(overallScore);

  return (
    <div style={{ background: T.paper, minHeight: "100dvh", fontFamily: "Inter, sans-serif", color: T.ink }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ background: T.hero, color: T.white, padding: "80px 48px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <Eyebrow color={T.ember}>Revenue Health Diagnostic™</Eyebrow>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 56,
              fontWeight: 400,
              lineHeight: 1.1,
              margin: "0 0 24px",
              color: T.white,
              maxWidth: 880,
            }}
          >
            You built it. That's exactly why you need another set of eyes on it.
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 720,
              margin: "0 0 32px",
            }}
          >
            Human conversations. Cross-functional discovery. A third-party lens on the system you're operating inside of every day.
          </p>

          {overallScore != null && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 13,
                color: "rgba(255,255,255,0.9)",
                marginBottom: 32,
              }}
            >
              <span style={{ opacity: 0.65 }}>Your current score</span>
              <span style={{ fontWeight: 700, color: T.white }}>{overallScore}</span>
              <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.2)" }} />
              <span style={{ color: T.ember, fontWeight: 700, letterSpacing: "0.04em" }}>{label}</span>
            </div>
          )}

          <div>
            <button
              onClick={scrollToForm}
              style={{
                background: T.ember,
                color: T.white,
                border: "none",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 700,
                padding: "14px 28px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Book a Discovery Call →
            </button>
          </div>
        </div>
      </section>

      {/* ── Founder Blindspots blurb ─────────────────────────────────────── */}
      <section style={{ padding: "72px 48px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Eyebrow>Why self-assessment has limits</Eyebrow>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: T.ink, margin: "0 0 20px" }}>
            Every founder has blind spots — areas where confidence is high but the underlying system is more fragile than it appears. Self-reported assessments capture your current perception of each system. They can't capture what you don't yet know to look for.
          </p>
          <a
            href="https://marketplacemaven.com/core-concepts/founder-blindspots/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.ember, fontWeight: 600, fontSize: 14, textDecoration: "none" }}
          >
            Read about founder blind spots →
          </a>
        </div>
      </section>

      {/* ── PBJ Sessions card ────────────────────────────────────────────── */}
      <section style={{ padding: "0 48px 72px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            background: T.hero,
            color: T.white,
            borderRadius: 16,
            padding: "56px 56px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
          }}
        >
          <div>
            <Eyebrow color="#4ABFC4">The mechanism</Eyebrow>
            <h2
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 38,
                fontWeight: 400,
                margin: "0 0 20px",
                color: T.white,
                lineHeight: 1.15,
              }}
            >
              PBJ Sessions™
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.78)", margin: "0 0 24px" }}>
              Named after a classroom exercise that exposes the gap between instructions given and instructions executed — PBJ Sessions are structured cross-functional working sessions that surface what leadership cannot see from above. We sit with your team. We ask the questions founders don't know to ask. What surfaces is almost always different from what leadership believes is true.
            </p>
            <a
              href="https://marketplacemaven.com/core-concepts/pbj-session/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4ABFC4", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
            >
              Learn about PBJ Sessions™ →
            </a>
          </div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { t: "Leadership interviews", d: "Map the stated system" },
              { t: "Cross-functional sessions", d: "Compare assumptions with reality" },
              { t: "Shadow Systems™ surface", d: "Undocumented workarounds become visible" },
              { t: "Contradictions documented", d: "Gaps become the roadmap" },
            ].map((s, i) => (
              <li key={s.t} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "rgba(74,191,196,0.15)",
                    color: "#4ABFC4",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.white, marginBottom: 4 }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Diagnostic report cards ──────────────────────────────────────── */}
      <section style={{ padding: "0 48px 72px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Eyebrow>What you unlock</Eyebrow>
          <h2
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 38,
              fontWeight: 400,
              margin: "0 0 12px",
              color: T.ink,
              lineHeight: 1.15,
            }}
          >
            Five reports. One complete picture.
          </h2>
          <p style={{ fontSize: 16, color: T.mid, margin: "0 0 36px", maxWidth: 700, lineHeight: 1.6 }}>
            Built from your Health Check data — confirmed, validated, and completed through the Diagnostic process with your team.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <ReportCard
              color={REPORT_COLORS.history}
              title="Health Check History"
              tagline="Track how your revenue health changes over time"
              body="See every assessment version side-by-side — score movement, system shifts, and whether interventions are working."
            />
            <ReportCard
              color={REPORT_COLORS.team}
              title="Team Alignment"
              tagline="Where your team sees the same thing — and where they don't"
              body="Compares scores across team members, surfacing misalignment between departments and leadership."
            />
            <ReportCard
              color={REPORT_COLORS.founder}
              title="Founder Dependency"
              tagline="Every place the business still runs through you"
              body="Maps the decisions, relationships, and workflows that can't move without founder involvement."
            />
            <ReportCard
              color={REPORT_COLORS.shadow}
              title="Shadow Systems™"
              tagline="The workarounds keeping your operation alive"
              body="Surfaces undocumented processes, informal spreadsheets, and side-channel workflows your team built when official systems stopped working."
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <ReportCard
                color={REPORT_COLORS.roadmap}
                title="Roadmap Builder"
                tagline="A prioritized 90-day plan built from what we actually find"
                body="Not a generic checklist. A sequenced roadmap built from your specific structural gaps — with a 60-minute leadership walkthrough of the full findings."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Process timeline ─────────────────────────────────────────────── */}
      <section style={{ padding: "0 48px 72px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Eyebrow>How it works</Eyebrow>
          <h2
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 38,
              fontWeight: 400,
              margin: "0 0 36px",
              color: T.ink,
              lineHeight: 1.15,
            }}
          >
            Four weeks. One clear picture.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {[
              { w: "Week 01", t: "Discovery", d: "We review your Health Check responses and pre-interview the leadership team to map the stated system." },
              { w: "Week 02", t: "PBJ Sessions™", d: "Structured working sessions with your cross-functional team to surface the system as it actually runs." },
              { w: "Week 03", t: "Systems Analysis", d: "We map contradictions, shadow systems, and founder-dependent workflows uncovered in discovery." },
              { w: "Week 04", t: "Strategic Roadmap", d: "A sequenced 90-day action plan delivered in a 60-minute leadership walkthrough." },
            ].map((s) => (
              <div
                key={s.w}
                style={{
                  background: T.white,
                  border: `1px solid ${T.offWhite}`,
                  borderRadius: 12,
                  padding: "24px 22px",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: T.ember, letterSpacing: "0.12em", marginBottom: 10 }}>
                  {s.w}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 10 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: T.mid, lineHeight: 1.6 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Discovery call form ──────────────────────────────────────────── */}
      <section id="discovery-form" style={{ padding: "0 48px 96px", scrollMarginTop: 32 }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <DiscoveryForm
            firstName={firstName}
            email={email}
            companyName={company?.company_name ?? ""}
            annualRevenue={company?.annual_revenue ?? ""}
            fundingStage={company?.funding_stage ?? ""}
            score={overallScore}
          />
        </div>
      </section>
    </div>
  );
}

function ReportCard({
  color,
  title,
  tagline,
  body,
}: {
  color: string;
  title: string;
  tagline: string;
  body: string;
}) {
  return (
    <div
      style={{
        background: T.white,
        borderRadius: 12,
        borderTop: `4px solid ${color}`,
        border: `1px solid ${T.offWhite}`,
        borderTopWidth: 4,
        borderTopColor: color,
        borderTopStyle: "solid",
        padding: "26px 26px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: T.mid,
            textTransform: "uppercase",
          }}
        >
          🔒 Diagnostic only
        </div>
      </div>
      <div style={{ fontSize: 19, fontWeight: 600, color: T.ink }}>{title}</div>
      <div style={{ fontSize: 14, color: color, fontWeight: 600 }}>{tagline}</div>
      <div style={{ fontSize: 14, color: T.mid, lineHeight: 1.6 }}>{body}</div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: T.ember,
          marginTop: "auto",
          paddingTop: 12,
        }}
      >
        CONFIRMED IN DIAGNOSTIC™
      </div>
    </div>
  );
}

function DiscoveryForm({
  firstName,
  email,
  companyName,
  annualRevenue,
  fundingStage,
  score,
}: {
  firstName: string;
  email: string;
  companyName: string;
  annualRevenue: string;
  fundingStage: string;
  score: number | null;
}) {
  const [openComments, setOpenComments] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrMsg("");
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          email,
          company_name: companyName,
          revenue_health_score: score,
          funding_stage: fundingStage,
          annual_revenue: annualRevenue,
          open_comments: openComments,
          team_members: teamMembers,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setState("done");
    } catch (err: any) {
      setErrMsg(err?.message ?? "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        style={{
          background: T.white,
          border: `1px solid ${T.offWhite}`,
          borderRadius: 16,
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 30,
            color: T.ink,
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          You're all set.
        </div>
        <div style={{ fontSize: 15, color: T.mid, lineHeight: 1.6 }}>
          Check your inbox for a calendar link — we'll see you soon.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: T.white,
        border: `1px solid ${T.offWhite}`,
        borderRadius: 16,
        padding: "40px 40px",
      }}
    >
      <Eyebrow>Start here</Eyebrow>
      <h2
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 32,
          fontWeight: 400,
          margin: "0 0 10px",
          color: T.ink,
          lineHeight: 1.2,
        }}
      >
        Book a 15-minute discovery call.
      </h2>
      <p style={{ fontSize: 15, color: T.mid, margin: "0 0 28px", lineHeight: 1.6 }}>
        Tell us a little about where you are. We'll send you a calendar link to find a time that works.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <ReadOnlyField label="Your name" value={firstName || "—"} />
        <ReadOnlyField label="Email" value={email || "—"} />
      </div>

      <Field label="Anything you want us to know before we talk?">
        <textarea
          value={openComments}
          onChange={(e) => setOpenComments(e.target.value)}
          rows={3}
          style={textareaStyle}
        />
      </Field>

      <Field label="Is there anyone else on your team who should be part of this conversation?">
        <textarea
          value={teamMembers}
          onChange={(e) => setTeamMembers(e.target.value)}
          rows={2}
          style={textareaStyle}
        />
      </Field>

      {state === "error" && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#B91C1C",
            border: "1px solid rgba(239,68,68,0.2)",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {errMsg || "Something went wrong. Please try again."}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        style={{
          background: T.ember,
          color: T.white,
          border: "none",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          fontWeight: 700,
          padding: "14px 28px",
          borderRadius: 10,
          cursor: state === "submitting" ? "not-allowed" : "pointer",
          opacity: state === "submitting" ? 0.7 : 1,
        }}
      >
        {state === "submitting" ? "Sending…" : "Send my info — I'll look for the calendar link"}
      </button>
      <div style={{ fontSize: 12, color: T.mid, marginTop: 12 }}>
        We'll follow up within one business day with a link to book your call.
      </div>
    </form>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${T.offWhite}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  color: T.ink,
  background: T.paper,
  resize: "vertical",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: T.mid, marginBottom: 6, fontWeight: 600, letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          padding: "10px 12px",
          background: T.offWhite,
          borderRadius: 8,
          fontSize: 14,
          color: T.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}
