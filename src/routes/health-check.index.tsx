import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  getHealthCheckData,
  saveResponse,
  updateSelectedChildIds,
  startNewAssessment,
  editCompletedResponse,
  type HealthCheckData,
  type ChildSystem,
  type Area,
} from "@/lib/healthcheck.functions";
import { useIsMobile } from "@/hooks/use-mobile";




export const Route = createFileRoute("/health-check/")({
  head: () => ({ meta: [{ title: "Health Check — Revenue Health Visualiser" }] }),
  component: HealthCheckPage,
});

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  teal: "#2A6B6E",
  tealBright: "#4ABFC4",
  mid: "#888880",
  ink: "#111111",
  white: "#FFFFFF",
};

const HEALTH_LABELS = ["Strongly Disagree", "Disagree", "Agree", "Strongly Agree"];
const TRACKING_LABELS = [
  "Not documented — runs on instinct",
  "Someone knows but nothing is written down",
  "We look at this occasionally, not consistently",
  "We track this regularly with real data",
  "Documented, measured, reviewed on a set cadence",
];

type ResponseMap = Record<string, { health: number | null; tracking: number | null }>;

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 3, background: T.offWhite, borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

function HealthCheckPage() {
  const fetchData = useServerFn(getHealthCheckData);
  const saveFn = useServerFn(saveResponse);
  const updateSelFn = useServerFn(updateSelectedChildIds);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["health-check"],
    queryFn: () => fetchData(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center" style={{ background: T.paper }}>
        <p className="text-sm" style={{ color: T.mid }}>Loading your Health Check…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-sm" style={{ color: T.ember }}>
        Failed to load: {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  if (data.isTeamMember && data.assessment.status === "completed") {
    return (
      <TeamMemberCompletionInline
        company={data.teamContext?.companyName ?? "your company"}
        ownerName={data.teamContext?.ownerFirstName ?? "your founder"}
        ownerEmail={data.teamContext?.ownerEmail ?? null}
        submittedAt={data.assessment.submitted_at ?? data.assessment.completed_at}
      />
    );
  }

  if (data.assessment.status === "completed") {
    return <CompletedLanding data={data} qc={qc} />;
  }

  return <HealthCheckShell data={data} saveFn={saveFn} updateSelFn={updateSelFn} qc={qc} />;
}

function TeamMemberCompletionInline({
  company,
  ownerName,
  ownerEmail,
  submittedAt,
}: {
  company: string;
  ownerName: string;
  ownerEmail: string | null;
  submittedAt: string | null;
}) {
  const submitted = submittedAt ? new Date(submittedAt) : new Date();
  const lockDate = new Date(submitted.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lockDateStr = lockDate.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  return (
    <div style={{ minHeight: "100%", background: T.paper, padding: "48px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ background: T.abyss, borderRadius: 16, padding: "40px 36px", color: T.white }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.tealBright, letterSpacing: "0.12em", marginBottom: 16 }}>
            ✓ HEALTH CHECK COMPLETE
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, fontWeight: 400, lineHeight: 1.2, margin: "0 0 16px" }}>
            Your responses have been submitted.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.78)", margin: "0 0 24px" }}>
            Thank you for completing the Health Check for {company}. {ownerName} will see how team
            scores compare to their own in the Team Alignment report. Your individual responses are
            always kept anonymous.
          </p>
          {ownerEmail && (
            <a href={`mailto:${ownerEmail}`} style={{ fontSize: 13, color: T.tealBright, textDecoration: "none", borderBottom: `1px solid ${T.tealBright}40` }}>
              Questions? Contact {ownerEmail}
            </a>
          )}
        </div>
        <p style={{ marginTop: 18, fontSize: 12, color: T.mid, textAlign: "center", lineHeight: 1.6 }}>
          You can return to update your answers until {lockDateStr}. After that your responses will be locked.
        </p>
      </div>
    </div>
  );
}

function quarterFromDate(d: Date) {
  return Math.floor(d.getMonth() / 3) + 1;
}

const HEALTH_SHORT = ["", "Strongly Disagree", "Disagree", "Agree", "Strongly Agree"];
const TRACKING_SHORT = [
  "",
  "Not documented",
  "Someone knows",
  "Occasional review",
  "Tracked regularly",
  "Documented & measured",
];

type LocalResponse = { health: number | null; tracking: number | null };

function ScoreRing({ score, color, size = 32 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.offWhite} strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size <= 36 ? 9 : 11,
          fontWeight: 700,
          color: T.ink,
        }}
      >
        {Math.round(pct)}
      </span>
    </div>
  );
}

function AnswerCard({
  area,
  response,
  systemColor,
  isLocked,
  onSave,
}: {
  area: Area;
  response: LocalResponse;
  systemColor: string;
  isLocked: boolean;
  onSave: (h: number, t: number) => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [health, setHealth] = useState<number>(response.health ?? 0);
  const [tracking, setTracking] = useState<number>(response.tracking ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHealth(response.health ?? 0);
    setTracking(response.tracking ?? 0);
  }, [response.health, response.tracking]);

  function handleEditClick() {
    if (isLocked) {
      toast("This Health Check is locked. Start a new Health Check to update your answers.");
      return;
    }
    setEditing(true);
  }

  async function handleSave() {
    if (!health || !tracking) return;
    setSaving(true);
    try {
      await onSave(health, tracking);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing && !isLocked) {
    return (
      <div
        style={{
          background: T.white,
          border: `1.5px solid ${systemColor}50`,
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 8,
          boxShadow: `0 2px 12px ${systemColor}15`,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: systemColor,
            letterSpacing: "0.1em",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          {area.name}
        </div>
        <div style={{ fontSize: 13, color: T.ink, marginBottom: 12 }}>{area.question_text}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, marginBottom: 6, letterSpacing: "0.08em" }}>
          HEALTH
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((v) => (
            <button
              key={v}
              onClick={() => setHealth(v)}
              style={{
                flex: "1 1 0",
                padding: "8px 4px",
                borderRadius: 8,
                border: `1.5px solid ${health === v ? systemColor : "rgba(0,0,0,0.1)"}`,
                background: health === v ? systemColor : T.offWhite,
                color: health === v ? T.white : T.mid,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {HEALTH_SHORT[v]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.mid, marginBottom: 6, letterSpacing: "0.08em" }}>
          TRACKING
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => setTracking(v)}
              style={{
                flex: "1 1 0",
                padding: "8px 4px",
                borderRadius: 8,
                border: `1.5px solid ${tracking === v ? systemColor : "rgba(0,0,0,0.1)"}`,
                background: tracking === v ? systemColor : T.offWhite,
                color: tracking === v ? T.white : T.mid,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {TRACKING_SHORT[v]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setEditing(false)}
            style={{
              background: "none",
              border: "none",
              color: T.mid,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !health || !tracking}
            style={{
              background: systemColor,
              color: T.white,
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              opacity: !health || !tracking ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : "Save →"}
          </button>
        </div>
      </div>
    );
  }

  const healthLabel = response.health && response.health > 0 ? HEALTH_SHORT[response.health] : "Skipped";
  const trackingLabel = response.tracking ? TRACKING_SHORT[response.tracking] : "—";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        marginBottom: 6,
        background: hovered ? systemColor + "06" : T.paper,
        border: `1px solid ${hovered ? systemColor + "30" : T.offWhite}`,
        borderRadius: 8,
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 13, color: T.tealBright, flexShrink: 0 }}>✓</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: systemColor,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {area.name}
      </span>
      <span style={{ color: T.offWhite, fontSize: 11 }}>·</span>
      <span style={{ fontSize: 12, color: T.mid }}>{healthLabel}</span>
      <span style={{ color: T.offWhite, fontSize: 11 }}>·</span>
      <span style={{ fontSize: 12, color: T.mid }}>{trackingLabel}</span>
      {!isLocked && hovered && (
        <button
          onClick={handleEditClick}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: T.teal,
            fontSize: 11,
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        >
          Edit →
        </button>
      )}
      {isLocked && hovered && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: T.mid,
            fontStyle: "italic",
            flexShrink: 0,
          }}
        >
          Locked
        </span>
      )}
    </div>
  );
}

function ChildBlock({
  child,
  areas,
  responses,
  childScore,
  systemColor,
  isLocked,
  onSave,
}: {
  child: ChildSystem;
  areas: Area[];
  responses: Record<string, LocalResponse>;
  childScore: number;
  systemColor: string;
  isLocked: boolean;
  onSave: (questionId: string, h: number, t: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: open ? systemColor + "08" : T.offWhite,
          border: `1px solid ${open ? systemColor + "30" : "transparent"}`,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: open ? systemColor : T.ink, flex: 1 }}>
          {child.name}
        </span>
        <span style={{ fontSize: 11, color: T.mid }}>{areas.length} areas</span>
        <ScoreRing score={childScore} color={systemColor} />
        <span
          style={{
            fontSize: 11,
            color: T.mid,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: 14, paddingTop: 6 }}>
          {areas.map((area) => {
            const r = responses[area.question_id] ?? { health: null, tracking: null };
            return (
              <AnswerCard
                key={area.id}
                area={area}
                response={r}
                systemColor={systemColor}
                isLocked={isLocked}
                onSave={(h, t) => onSave(area.question_id, h, t)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompletedLanding({
  data,
  qc,
}: {
  data: HealthCheckData;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const startFn = useServerFn(startNewAssessment);
  const editFn = useServerFn(editCompletedResponse);
  const [starting, setStarting] = useState(false);

  const submittedAt = data.assessment.submitted_at ?? data.assessment.completed_at;
  const submittedDate = submittedAt ? new Date(submittedAt) : new Date();
  const lockDate = new Date(submittedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isLocked = new Date() > lockDate;
  const lockDateStr = lockDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const completedQ = quarterFromDate(submittedDate);
  const nowQ = quarterFromDate(new Date());
  const nextQ = nowQ === 4 ? 1 : nowQ + 1;

  const selectedSet = new Set(data.assessment.selected_child_ids ?? []);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, ChildSystem[]>();
    for (const c of data.children) {
      const arr = m.get(c.parent_system_id) ?? [];
      arr.push(c);
      m.set(c.parent_system_id, arr);
    }
    for (const v of m.values()) v.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [data.children]);

  const areasByChild = useMemo(() => {
    const m = new Map<string, Area[]>();
    for (const a of data.areas) {
      const arr = m.get(a.child_system_id) ?? [];
      arr.push(a);
      m.set(a.child_system_id, arr);
    }
    for (const v of m.values()) v.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [data.areas]);

  const scoreByChild = useMemo(() => {
    const m = new Map<string, { health: number; tracking: number }>();
    for (const s of data.scores) {
      m.set(s.child_system_id, { health: s.health_score, tracking: s.tracking_score });
    }
    return m;
  }, [data.scores]);

  const [responses, setResponses] = useState<Record<string, LocalResponse>>(() => {
    const m: Record<string, LocalResponse> = {};
    for (const r of data.responses) {
      m[r.question_id] = { health: r.health_response, tracking: r.tracking_response };
    }
    return m;
  });

  useEffect(() => {
    const m: Record<string, LocalResponse> = {};
    for (const r of data.responses) {
      m[r.question_id] = { health: r.health_response, tracking: r.tracking_response };
    }
    setResponses(m);
  }, [data.responses]);

  const [activeParentId, setActiveParentId] = useState<string>(data.parents[0]?.id ?? "");
  const activeParent = data.parents.find((p) => p.id === activeParentId) ?? data.parents[0];
  const systemColor = activeParent?.color_hex ? `#${activeParent.color_hex}` : T.teal;

  async function handleStart() {
    setStarting(true);
    try {
      await startFn();
      await qc.invalidateQueries({ queryKey: ["health-check"] });
    } finally {
      setStarting(false);
    }
  }

  async function handleSaveEdit(questionId: string, health: number, tracking: number) {
    try {
      await editFn({
        data: {
          assessment_id: data.assessment.id,
          question_id: questionId,
          health_response: health,
          tracking_response: tracking,
        },
      });
      setResponses((prev) => ({ ...prev, [questionId]: { health, tracking } }));
      await qc.invalidateQueries({ queryKey: ["health-check"] });
      toast.success("Answer updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save edit");
    }
  }

  const activeChildren = activeParent ? childrenByParent.get(activeParent.id) ?? [] : [];
  const assessedChildren = activeChildren.filter(
    (c) => data.tier !== "starter" || selectedSet.has(c.code),
  );
  const unassessedChildren =
    data.tier === "starter" ? activeChildren.filter((c) => !selectedSet.has(c.code)) : [];

  return (
    <div style={{ minHeight: "100%", background: T.paper, display: "flex" }}>
      {/* Left nav — parent systems */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: `1px solid ${T.offWhite}`,
          padding: "16px 0",
        }}
      >
        {data.parents.map((p) => {
          const color = `#${p.color_hex}`;
          const active = activeParentId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActiveParentId(p.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: active ? color + "10" : "none",
                border: "none",
                borderLeft: `3px solid ${active ? color : "transparent"}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? color : T.ink,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    height: 3,
                    background: T.offWhite,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ height: "100%", width: "100%", background: color, borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: T.tealBright, fontWeight: 600 }}>100%</span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {/* Completion banner */}
        <div
          style={{
            background: T.abyss,
            borderRadius: 14,
            padding: "28px 32px",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -20,
              top: -20,
              bottom: -20,
              width: 240,
              background: `radial-gradient(circle at 80% 50%, ${T.tealBright}12, transparent 70%)`,
            }}
          />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "inline-flex" }}>
              <div
                style={{
                  background: T.tealBright + "22",
                  border: `1px solid ${T.tealBright}40`,
                  borderRadius: 20,
                  padding: "4px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.tealBright,
                  letterSpacing: "0.06em",
                }}
              >
                ✓ 100% COMPLETE
              </div>
            </div>
            <h2
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 32,
                fontWeight: 400,
                color: T.white,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Your Q{completedQ} Health Check is complete.
            </h2>
            {!isLocked ? (
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                You can edit your answers until{" "}
                <span style={{ color: T.tealBright, fontWeight: 600 }}>{lockDateStr}</span>. After
                that your Health Check will be locked.
              </p>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                This Health Check was locked on {lockDateStr}. Start your Q{nextQ} Health Check when
                your business has shifted enough to warrant a fresh diagnostic.
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <Link
                to="/reports/executive-summary"
                style={{
                  background: T.ember,
                  color: T.white,
                  borderRadius: 8,
                  padding: "11px 22px",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View Your Report →
              </Link>
              <button
                onClick={handleStart}
                disabled={starting}
                style={{
                  background: "transparent",
                  color: "rgba(255,255,255,0.65)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "11px 22px",
                  fontSize: 13,
                  cursor: starting ? "wait" : "pointer",
                }}
              >
                {starting ? "Starting…" : `Start Q${nextQ} Health Check`}
              </button>
            </div>
          </div>
        </div>

        {/* System header */}
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 22,
              fontWeight: 400,
              color: systemColor,
              margin: "0 0 4px",
            }}
          >
            {activeParent?.name}
          </h3>
          <p style={{ fontSize: 12, color: T.mid, margin: 0 }}>
            {assessedChildren.length} subsystems assessed · click any subsystem to review your answers
            {!isLocked && <span style={{ color: T.teal }}> · hover any answer to edit</span>}
          </p>
        </div>

        {/* Assessed children */}
        {assessedChildren.map((c) => {
          const areas = areasByChild.get(c.id) ?? [];
          const score = scoreByChild.get(c.id)?.health ?? 0;
          return (
            <ChildBlock
              key={c.id}
              child={c}
              areas={areas}
              responses={responses}
              childScore={score}
              systemColor={systemColor}
              isLocked={isLocked}
              onSave={handleSaveEdit}
            />
          );
        })}

        {/* Unassessed (starter only) */}
        {unassessedChildren.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.mid,
                letterSpacing: "0.1em",
                marginBottom: 10,
              }}
            >
              NOT ASSESSED IN THIS HEALTH CHECK
            </div>
            {unassessedChildren.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  marginBottom: 6,
                  background: T.offWhite,
                  borderRadius: 8,
                  opacity: 0.7,
                }}
              >
                <span style={{ fontSize: 12 }}>🔒</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: T.mid }}>{c.name}</span>
                <span style={{ fontSize: 11, color: T.mid, marginLeft: 4 }}>
                  · Not selected for this Health Check
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: T.teal,
                    cursor: "pointer",
                  }}
                >
                  Include in Q{nextQ} →
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthCheckShell({
  data,
  saveFn,
  updateSelFn,
  qc,
}: {
  data: HealthCheckData;
  saveFn: ReturnType<typeof useServerFn<typeof saveResponse>>;
  updateSelFn: ReturnType<typeof useServerFn<typeof updateSelectedChildIds>>;
  qc: ReturnType<typeof useQueryClient>;
}) {

  const { tier, assessment, parents, children, areas } = data;

  // Build a response map keyed by question_id
  const initialResponses = useMemo<ResponseMap>(() => {
    const m: ResponseMap = {};
    for (const r of data.responses) {
      m[r.question_id] = {
        health: r.health_response,
        tracking: r.tracking_response,
      };
    }
    return m;
  }, [data.responses]);

  const [responses, setResponses] = useState<ResponseMap>(initialResponses);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [autoCollapsed, setAutoCollapsed] = useState<Record<string, boolean>>({});
  const [manuallyExpanded, setManuallyExpanded] = useState<Record<string, boolean>>({});
  const [completedBanner, setCompletedBanner] = useState(
    assessment.status === "completed",
  );

  const childrenByParent = useMemo(() => {
    const m = new Map<string, ChildSystem[]>();
    for (const c of children) {
      const arr = m.get(c.parent_system_id) ?? [];
      arr.push(c);
      m.set(c.parent_system_id, arr);
    }
    for (const v of m.values()) v.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [children]);

  const areasByChild = useMemo(() => {
    const m = new Map<string, Area[]>();
    for (const a of areas) {
      const arr = m.get(a.child_system_id) ?? [];
      arr.push(a);
      m.set(a.child_system_id, arr);
    }
    for (const v of m.values()) v.sort((a, b) => a.sort_order - b.sort_order);
    return m;
  }, [areas]);

  // Selection state (starter tier only — pro/diagnostic ignore this)
  // DB is the source of truth: re-sync whenever the server payload changes.
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    assessment.selected_child_ids ?? [],
  );
  useEffect(() => {
    setSelectedCodes(assessment.selected_child_ids ?? []);
  }, [assessment.selected_child_ids]);

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);





  const selectedForParent = useCallback(
    (parentId: string) => {
      const list = childrenByParent.get(parentId) ?? [];
      return list.filter((c) => selectedSet.has(c.code));
    },
    [childrenByParent, selectedSet],
  );

  const childHasResponses = useCallback(
    (c: ChildSystem) => {
      const arr = areasByChild.get(c.id) ?? [];
      return arr.some((a) => {
        const r = responses[a.question_id];
        return r && r.health !== null;
      });
    },
    [areasByChild, responses],
  );

  // Tier-aware lock predicate
  const isChildLocked = useCallback(
    (c: ChildSystem) => {
      if (tier !== "starter") return false;
      const parentSelected = selectedForParent(c.parent_system_id);
      // selection complete: only the 3 selected are unlocked
      if (parentSelected.length >= 3) return !selectedSet.has(c.code);
      // mid-selection: nothing is "locked" — chip is selectable
      return false;
    },
    [tier, selectedForParent, selectedSet],
  );

  // pre-select first parent, first available child for that parent
  const firstParent = parents[0];
  const initialChild = useMemo(() => {
    if (!firstParent) return null;
    const list = childrenByParent.get(firstParent.id) ?? [];
    if (tier === "starter") {
      const selFor = list.filter((c) => selectedSet.has(c.code));
      if (selFor.length === 0) return null; // selection mode, no card shown
      return selFor[0];
    }
    return list[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstParent, childrenByParent, tier]);

  const [activeParentId, setActiveParentId] = useState<string | null>(
    firstParent?.id ?? null,
  );
  const [activeChildId, setActiveChildId] = useState<string | null>(
    initialChild?.id ?? null,
  );

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Persist selection helper (debounced lightly)
  const selTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSelection = useCallback(
    (codes: string[]) => {
      if (selTimer.current) clearTimeout(selTimer.current);
      selTimer.current = setTimeout(() => {
        updateSelFn({
          data: { assessment_id: assessment.id, selected_child_ids: codes },
        }).catch((e) => console.error(e));
      }, 300);
    },
    [assessment.id, updateSelFn],
  );

  function toggleChipSelection(c: ChildSystem) {
    if (tier !== "starter") return;
    const parentSel = selectedForParent(c.parent_system_id);
    const isSelected = selectedSet.has(c.code);
    let next: string[];
    if (isSelected) {
      if (childHasResponses(c)) return; // in progress, cannot deselect
      next = selectedCodes.filter((code) => code !== c.code);
    } else {
      if (parentSel.length >= 3) return; // cap reached
      next = [...selectedCodes, c.code];
    }
    setSelectedCodes(next);
    persistSelection(next);
    // when this completes the parent selection, focus first selected child
    if (!isSelected) {
      const newParentSel = [...parentSel.map((x) => x.code), c.code];
      if (newParentSel.length === 3) {
        const list = childrenByParent.get(c.parent_system_id) ?? [];
        const firstSel = list.find((x) => newParentSel.includes(x.code));
        if (firstSel) setActiveChildId(firstSel.id);
      } else if (parentSel.length === 0) {
        // first pick — surface its card
        setActiveChildId(c.id);
      }
    } else if (activeChildId === c.id) {
      setActiveChildId(null);
    }
  }


  // Overall completion — mirror server's computeCompletionPct exactly:
  // - starter: only areas under children whose code ∈ selectedSet
  // - pro/diagnostic: all areas
  // - exclude skipped (health === -1) and require tracking
  // - dedupe by question_id (areas already 1:1 with question_id)
  const totalUnlocked = data.totalUnlockedAreas;
  const completedCount = useMemo(() => {
    const relevantChildIds = new Set(
      tier === "starter"
        ? children.filter((c) => selectedSet.has(c.code)).map((c) => c.id)
        : children.map((c) => c.id),
    );
    const seen = new Set<string>();
    let done = 0;
    for (const a of areas) {
      if (!relevantChildIds.has(a.child_system_id)) continue;
      if (seen.has(a.question_id)) continue;
      seen.add(a.question_id);
      const r = responses[a.question_id];
      if (
        r &&
        r.health !== null &&
        r.health !== -1 &&
        r.tracking !== null
      ) {
        done++;
      }
    }
    return done;
  }, [tier, areas, children, responses, selectedSet]);
  const completionPct = totalUnlocked
    ? Math.min(100, Math.round((completedCount / totalUnlocked) * 100))
    : 0;

  // Save helper (debounced per question)
  const persist = useCallback(
    (questionId: string, health: number | null, tracking: number | null) => {
      setSaveState("saving");
      if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId]);
      saveTimers.current[questionId] = setTimeout(async () => {
        try {
          const res = await saveFn({
            data: {
              assessment_id: assessment.id,
              question_id: questionId,
              health_response: health,
              tracking_response: tracking,
            },
          });
          setSaveState("saved");
          if (res?.completed) {
            setCompletedBanner(true);
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }
        } catch (e) {
          setSaveState("idle");
          console.error(e);
        }
      }, 2000);
    },
    [assessment.id, saveFn, qc],
  );

  function setHealth(area: Area, value: number) {
    const qid = area.question_id;
    setResponses((prev) => {
      const cur = prev[qid] ?? { health: null, tracking: null };
      const next = { ...cur, health: value };
      persist(qid, next.health, next.tracking);
      return { ...prev, [qid]: next };
    });
    // Changing health re-opens the card so the user can pick tracking again
    setAutoCollapsed((s) => ({ ...s, [qid]: false }));
    setManuallyExpanded((s) => ({ ...s, [qid]: false }));
    if (value === -1) {
      setTimeout(() => {
        setAutoCollapsed((s) => ({ ...s, [qid]: true }));
      }, 600);
      setTimeout(() => advanceToNext(area), 700);
    }
  }

  function setTracking(area: Area, value: number) {
    const qid = area.question_id;
    setResponses((prev) => {
      const cur = prev[qid] ?? { health: null, tracking: null };
      const next = { ...cur, tracking: value };
      persist(qid, next.health, next.tracking);
      return { ...prev, [qid]: next };
    });
    setManuallyExpanded((s) => ({ ...s, [qid]: false }));
    setTimeout(() => {
      setAutoCollapsed((s) => ({ ...s, [qid]: true }));
    }, 600);
    setTimeout(() => advanceToNext(area), 700);
  }

  function advanceToNext(area: Area) {
    const list = areasByChild.get(area.child_system_id) ?? [];
    const idx = list.findIndex((a) => a.id === area.id);
    const next = list.slice(idx + 1).find((a) => {
      const r = responses[a.question_id];
      return !r || r.health === null || r.health === 0;
    });
    if (next) {
      const el = cardRefs.current[next.question_id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const skipped = list.filter((a) => responses[a.question_id]?.health === -1);
      if (skipped.length > 0) setShowSkipWarning(true);
    }
  }

  const activeParent = parents.find((p) => p.id === activeParentId) ?? parents[0];
  const activeChildren = activeParent ? childrenByParent.get(activeParent.id) ?? [] : [];
  // For starter in mid-selection (none picked) activeChild is null → show only chips
  const activeParentSelectedCount = activeParent
    ? selectedForParent(activeParent.id).length
    : 0;
  const inSelectionMode =
    tier === "starter" && activeParentSelectedCount < 3;
  const noSelectionsYet =
    tier === "starter" && activeParentSelectedCount === 0;

  const activeChild = noSelectionsYet
    ? null
    : activeChildren.find((c) => c.id === activeChildId) ??
      activeChildren.find((c) => !isChildLocked(c)) ??
      activeChildren[0] ??
      null;
  const activeAreas = activeChild ? areasByChild.get(activeChild.id) ?? [] : [];
  const systemColor = activeParent?.color_hex ? `#${activeParent.color_hex}` : T.teal;

  const childComplete =
    activeChild &&
    activeAreas.length > 0 &&
    activeAreas.every((a) => {
      const r = responses[a.question_id];
      return r && r.health !== null && r.health > 0 && r.tracking !== null;
    });
  const childSkippedCount = activeAreas.filter(
    (a) => responses[a.question_id]?.health === -1,
  ).length;

  function selectChild(c: ChildSystem) {
    // In selection mode, clicking a chip toggles selection instead of navigating
    if (tier === "starter" && inSelectionMode) {
      toggleChipSelection(c);
      return;
    }
    if (isChildLocked(c)) return;
    setShowSkipWarning(false);
    setActiveChildId(c.id);
  }

  function selectParent(pid: string) {
    setActiveParentId(pid);
    const list = childrenByParent.get(pid) ?? [];
    if (tier === "starter") {
      const selFor = list.filter((c) => selectedSet.has(c.code));
      setActiveChildId(selFor.length > 0 ? selFor[0].id : null);
    } else {
      const first = list[0];
      if (first) setActiveChildId(first.id);
    }
    setShowSkipWarning(false);
  }

  // Left rail collapse — persisted; default collapsed on small screens
  const [leftRailCollapsed, setLeftRailCollapsed] = useState<boolean>(false);
  const leftRailHydrated = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Apply initial default once on mount (post-SSR)
    if (!leftRailHydrated.current) {
      leftRailHydrated.current = true;
      const stored = window.localStorage.getItem("hc-leftrail-collapsed");
      if (stored !== null) {
        setLeftRailCollapsed(stored === "1");
      } else if (window.innerWidth < 768) {
        setLeftRailCollapsed(true);
      }
      return;
    }
    window.localStorage.setItem("hc-leftrail-collapsed", leftRailCollapsed ? "1" : "0");
  }, [leftRailCollapsed]);




  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: T.paper,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          background: T.paper,
          borderBottom: `1px solid ${T.offWhite}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
          <span
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 17,
              color: T.ink,
            }}
          >
            Health Check
          </span>
          <div style={{ width: 200 }}>
            <ProgressBar pct={completionPct} color={T.tealBright} />
          </div>
          <span style={{ fontSize: 11, color: T.mid }}>{completionPct}% complete</span>
        </div>
        <div>
          {saveState === "saving" && (
            <span style={{ fontSize: 11, color: T.mid }}>Saving…</span>
          )}
          {saveState === "saved" && (
            <span style={{ fontSize: 11, color: T.teal }}>✓ Saved</span>
          )}
        </div>
      </div>

      {/* Tier indicator bar */}
      <div
        style={{
          minHeight: 32,
          background: data.isTeamMember ? T.abyss : T.offWhite,
          display: "flex",
          alignItems: "center",
          padding: data.isTeamMember ? "8px 24px" : "0 24px",
          fontSize: 11,
          color: data.isTeamMember ? T.white : T.mid,
          flexShrink: 0,
        }}
      >
        {data.isTeamMember ? (
          <span style={{ lineHeight: 1.5 }}>
            You are completing this Health Check on behalf of{" "}
            <strong style={{ color: T.tealBright }}>
              {data.teamContext?.companyName ?? "your company"}
            </strong>
            . Your responses are anonymous.
          </span>
        ) : (
          <>
            {tier === "starter" && (
              <span>
                Revenue Health Snapshot™ · 15 subsystems ·{" "}
                <a
                  href="/upgrade"
                  style={{ color: T.teal, textDecoration: "none", fontWeight: 500 }}
                >
                  Upgrade for full access ↗
                </a>
              </span>
            )}
            {tier === "pro" && (
              <span>Revenue Health Assessment™ · All 50 subsystems unlocked</span>
            )}
            {tier === "diagnostic" && (
              <span>Revenue Health Diagnostic™ · All 50 subsystems unlocked</span>
            )}
          </>
        )}
      </div>


      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left nav */}
        <div
          style={{
            width: leftRailCollapsed ? 48 : 220,
            flexShrink: 0,
            borderRight: `1px solid ${T.offWhite}`,
            overflowY: "auto",
            overflowX: "hidden",
            paddingTop: 8,
            transition: "width 200ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: leftRailCollapsed ? "center" : "flex-end",
              padding: "0 8px 8px",
            }}
          >
            <button
              type="button"
              onClick={() => setLeftRailCollapsed((v) => !v)}
              title={leftRailCollapsed ? "Expand systems" : "Collapse systems"}
              aria-label={leftRailCollapsed ? "Expand systems" : "Collapse systems"}
              style={{
                background: T.offWhite,
                border: `1px solid ${T.mid}`,
                borderRadius: 6,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: T.ink,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {leftRailCollapsed ? "»" : "«"}
            </button>
          </div>

          {parents.map((p) => {
            const list = childrenByParent.get(p.id) ?? [];
            const totalAreas = list.reduce(
              (s, c) => s + (areasByChild.get(c.id)?.length ?? 0),
              0,
            );
            const doneAreas = list.reduce((s, c) => {
              const arr = areasByChild.get(c.id) ?? [];
              return (
                s +
                arr.filter((a) => {
                  const r = responses[a.question_id];
                  return r && r.health !== null && r.health > 0 && r.tracking !== null;
                }).length
              );
            }, 0);
            const pct = totalAreas ? Math.round((doneAreas / totalAreas) * 100) : 0;
            const isActiveParent = p.id === activeParent?.id;
            const color = `#${p.color_hex}`;

            return (
              <div key={p.id}>
                <button
                  onClick={() => {
                    if (leftRailCollapsed) setLeftRailCollapsed(false);
                    selectParent(p.id);
                  }}
                  title={leftRailCollapsed ? `${p.name}${pct > 0 ? ` — ${pct}%` : ""}` : undefined}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: leftRailCollapsed ? "10px 0" : "10px 16px",
                    justifyContent: leftRailCollapsed ? "center" : "flex-start",
                    background: isActiveParent ? `${color}10` : "none",
                    border: "none",
                    borderLeft: `3px solid ${isActiveParent ? color : "transparent"}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: leftRailCollapsed ? 10 : 8,
                      height: leftRailCollapsed ? 10 : 8,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  {!leftRailCollapsed && (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: isActiveParent ? color : T.ink,
                          }}
                        >
                          {p.name}
                        </div>
                        {pct > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <ProgressBar pct={pct} color={color} />
                          </div>
                        )}
                      </div>
                      {pct > 0 && (
                        <span style={{ fontSize: 10, color: T.mid }}>{pct}%</span>
                      )}
                    </>
                  )}
                </button>

                {!leftRailCollapsed && isActiveParent &&
                  list.map((c) => {
                    const locked = isChildLocked(c);
                    const arr = areasByChild.get(c.id) ?? [];
                    const complete =
                      arr.length > 0 &&
                      arr.every((a) => {
                        const r = responses[a.question_id];
                        return (
                          r &&
                          r.health !== null &&
                          r.health > 0 &&
                          r.tracking !== null
                        );
                      });
                    const hasSkipped = arr.some(
                      (a) => responses[a.question_id]?.health === -1,
                    );
                    const isActive = c.id === activeChild?.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => selectChild(c)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 16px 7px 34px",
                          background: isActive ? `${color}08` : "none",
                          border: "none",
                          borderLeft: `3px solid ${
                            isActive ? color : "transparent"
                          }`,
                          cursor: locked ? "not-allowed" : "pointer",
                          opacity: locked ? 0.45 : 1,
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 11, width: 14, flexShrink: 0 }}>
                          {locked ? "🔒" : complete ? "✓" : hasSkipped ? "○" : ""}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 500 : 400,
                            color: complete ? T.teal : isActive ? color : T.mid,
                          }}
                        >
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );

          })}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {completedBanner && (
            <div
              style={{
                background: `${T.tealBright}15`,
                border: `1px solid ${T.tealBright}40`,
                borderRadius: 10,
                padding: "14px 18px",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: T.ink }}>
                Your Revenue Health Check is complete.
              </span>
              <a
                href="/report"
                style={{
                  background: T.ember,
                  color: T.white,
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View your Report →
              </a>
            </div>
          )}

          {activeParent && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: 20,
                  color: systemColor,
                  marginBottom: 8,
                }}
              >
                {activeParent.name}
              </div>

              {/* Snapshot selection instruction */}
              {tier === "starter" && !data.isTeamMember && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.mid,
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {activeParentSelectedCount < 3 ? (
                    <>
                      You're on Revenue Health Snapshot™ — select 3 subsystems
                      to evaluate in this system. Choose the ones most relevant
                      to your business right now.
                    </>
                  ) : (
                    <>3 subsystems selected. Start answering below ↓</>
                  )}
                </div>
              )}

              {/* Chips */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                {activeChildren.map((c) => {
                  const locked = isChildLocked(c);
                  const selected = tier === "starter" && selectedSet.has(c.code);
                  const hasResp = childHasResponses(c);
                  const arr = areasByChild.get(c.id) ?? [];
                  const complete =
                    arr.length > 0 &&
                    arr.every((a) => {
                      const r = responses[a.question_id];
                      return (
                        r &&
                        r.health !== null &&
                        r.health > 0 &&
                        r.tracking !== null
                      );
                    });
                  const hasSkipped = arr.some(
                    (a) => responses[a.question_id]?.health === -1,
                  );
                  const active = c.id === activeChild?.id;
                  const highlight =
                    tier === "starter" ? selected || active : active;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectChild(c)}
                      disabled={locked}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: `1.5px solid ${
                          locked
                            ? "rgba(0,0,0,0.08)"
                            : highlight
                            ? systemColor
                            : complete
                            ? `${T.tealBright}60`
                            : "rgba(0,0,0,0.1)"
                        }`,
                        background: highlight
                          ? `${systemColor}15`
                          : complete
                          ? `${T.tealBright}10`
                          : T.white,
                        color: locked
                          ? T.mid
                          : highlight
                          ? systemColor
                          : complete
                          ? T.teal
                          : T.ink,
                        fontSize: 12,
                        fontWeight: highlight ? 600 : 400,
                        cursor: locked ? "not-allowed" : "pointer",
                        opacity: locked ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {locked && <span style={{ fontSize: 10 }}>🔒</span>}
                      {complete && !locked && (
                        <span style={{ fontSize: 10, color: T.tealBright }}>✓</span>
                      )}
                      {hasSkipped && !complete && !locked && (
                        <span style={{ fontSize: 10, color: T.mid }}>○</span>
                      )}
                      {c.name}
                      {tier === "starter" && selected && hasResp && (
                        <span
                          style={{
                            fontSize: 10,
                            color: T.mid,
                            marginLeft: 4,
                            fontWeight: 400,
                          }}
                        >
                          · In progress
                        </span>
                      )}
                    </button>
                  );
                })}

                {tier === "starter" && !data.isTeamMember && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: systemColor,
                      marginLeft: "auto",
                    }}
                  >
                    {activeParentSelectedCount} of 3 selected
                  </span>
                )}
              </div>

              {/* Change selection link */}
              {tier === "starter" && !data.isTeamMember &&
                activeParentSelectedCount > 0 &&
                activeParentSelectedCount < 3 && (
                  <div style={{ marginBottom: 14 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.mid,
                        textDecoration: "underline",
                      }}
                    >
                      Change selection
                    </span>
                  </div>
                )}

              <div style={{ height: 12 }} />


              {activeChild && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: T.ink,
                        marginBottom: 2,
                      }}
                    >
                      {activeChild.name}
                    </h2>
                    <p style={{ fontSize: 12, color: T.mid }}>
                      {activeAreas.length} areas · each has a health score and a
                      tracking question
                    </p>
                  </div>
                  {childComplete && (
                    <div
                      style={{
                        background: `${T.tealBright}20`,
                        border: `1px solid ${T.tealBright}40`,
                        borderRadius: 20,
                        padding: "4px 14px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.teal,
                      }}
                    >
                      ✓ Complete
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Locked or cards */}
          {activeChild && isChildLocked(activeChild) ? (
            <div
              style={{
                background: T.white,
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                minHeight: 200,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 12,
                  backdropFilter: "blur(4px)",
                  background: `${T.teal}08`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 28 }}>🔒</div>
                <p style={{ fontSize: 14, color: T.teal, fontWeight: 500 }}>
                  {activeChild.name} is available in Revenue Health Assessment™
                </p>
                <a
                  href="/upgrade"
                  style={{
                    background: T.ember,
                    color: T.white,
                    borderRadius: 8,
                    padding: "10px 22px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Unlock all 50 subsystems →
                </a>
              </div>
            </div>
          ) : (
            <>
              {activeAreas.map((area) => {
                const r = responses[area.question_id] ?? {
                  health: null,
                  tracking: null,
                };
                const isSkipped = r.health === -1;
                const isComplete =
                  r.health !== null && r.health > 0 && r.tracking !== null;
                const collapsed =
                  (isComplete || isSkipped) &&
                  autoCollapsed[area.question_id] &&
                  !manuallyExpanded[area.question_id];

                if (collapsed) {
                  const healthLabel =
                    isSkipped || r.health === null || r.health <= 0
                      ? "Skipped"
                      : HEALTH_LABELS[r.health - 1];
                  const trackingLabel =
                    !isSkipped && r.tracking !== null
                      ? TRACKING_LABELS[r.tracking - 1]
                      : null;
                  return (
                    <div
                      key={area.id}
                      ref={(el) => {
                        cardRefs.current[area.question_id] = el;
                      }}
                      className="hc-card-compact"
                      onClick={() =>
                        setManuallyExpanded((s) => ({
                          ...s,
                          [area.question_id]: true,
                        }))
                      }
                      style={{
                        background: T.paper,
                        border: `1px solid ${
                          isSkipped ? "rgba(136,136,128,0.3)" : `${systemColor}4D`
                        }`,
                        borderRadius: 12,
                        marginBottom: 14,
                        height: 44,
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <span
                        style={{
                          color: isSkipped ? T.mid : T.tealBright,
                          fontSize: 14,
                          fontWeight: 700,
                          width: 14,
                          display: "inline-block",
                          textAlign: "center",
                          lineHeight: 1,
                        }}
                      >
                        {isSkipped ? "○" : "✓"}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: isSkipped ? T.mid : systemColor,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {area.name}
                      </span>
                      <span style={{ color: T.mid, fontSize: 12 }}>·</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: T.mid,
                          fontStyle: isSkipped ? "italic" : "normal",
                        }}
                      >
                        {healthLabel}
                      </span>
                      {trackingLabel && (
                        <>
                          <span style={{ color: T.mid, fontSize: 12 }}>·</span>
                          <span
                            style={{
                              fontSize: 12,
                              color: T.mid,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {trackingLabel}
                          </span>
                        </>
                      )}
                      <span
                        className="hc-card-edit"
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          color: T.teal,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isSkipped ? "Answer this →" : "Edit →"}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={area.id}
                    ref={(el) => {
                      cardRefs.current[area.question_id] = el;
                    }}
                    style={{
                      background: T.white,
                      border: `1px solid ${
                        isComplete ? `${T.tealBright}50` : "rgba(0,0,0,0.08)"
                      }`,
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 14,
                      position: "relative",
                    }}
                  >
                    {isComplete && (
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: T.tealBright,
                          color: T.white,
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ✓
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: systemColor,
                        fontWeight: 600,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {area.name}
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        color: T.ink,
                        lineHeight: 1.5,
                        marginBottom: area.helper_text ? 10 : 14,
                      }}
                    >
                      {area.question_text}
                    </p>
                    {area.helper_text && (
                      <div
                        style={{
                          borderLeft: `2px solid ${T.offWhite}`,
                          paddingLeft: 10,
                          marginBottom: 14,
                          fontSize: 12,
                          color: T.mid,
                          lineHeight: 1.5,
                        }}
                      >
                        {area.helper_text}
                      </div>
                    )}

                    {/* Health 4-button scale */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      {HEALTH_LABELS.map((label, i) => {
                        const val = i + 1;
                        const sel = r.health === val;
                        return (
                          <button
                            key={val}
                            onClick={() => setHealth(area, val)}
                            style={{
                              padding: "10px 8px",
                              border: `1px solid ${
                                sel ? systemColor : "rgba(0,0,0,0.1)"
                              }`,
                              background: sel ? `${systemColor}15` : T.white,
                              color: sel ? systemColor : T.ink,
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: sel ? 600 : 400,
                              cursor: "pointer",
                              textAlign: "center",
                              lineHeight: 1.3,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setHealth(area, -1)}
                      style={{
                        background: "none",
                        border: "none",
                        color: isSkipped ? T.ember : T.mid,
                        fontSize: 11,
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: "4px 0",
                      }}
                    >
                      {isSkipped ? "Skipped" : "Not sure, skip for now"}
                    </button>

                    {/* Tracking — only after health is selected (not skipped) */}
                    {r.health !== null && r.health > 0 && (
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: `1px solid ${T.offWhite}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.ink,
                            marginBottom: 10,
                          }}
                        >
                          How is this tracked in your business?
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {TRACKING_LABELS.map((label, i) => {
                            const val = i + 1;
                            const sel = r.tracking === val;
                            return (
                              <label
                                key={val}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${
                                    sel ? systemColor : "rgba(0,0,0,0.08)"
                                  }`,
                                  background: sel ? `${systemColor}10` : T.white,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  color: sel ? systemColor : T.ink,
                                  fontWeight: sel ? 500 : 400,
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`track-${area.id}`}
                                  checked={sel}
                                  onChange={() => setTracking(area, val)}
                                  style={{ accentColor: systemColor }}
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {showSkipWarning && childSkippedCount > 0 && (
                <div
                  style={{
                    background: "rgba(240,82,35,0.06)",
                    border: "1px solid rgba(240,82,35,0.2)",
                    borderRadius: 10,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 13, color: T.ink }}>
                    You skipped {childSkippedCount} question
                    {childSkippedCount > 1 ? "s" : ""} — stay here or continue?
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setShowSkipWarning(false)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${T.ember}`,
                        color: T.ember,
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Stay
                    </button>
                    <button
                      onClick={() => {
                        setShowSkipWarning(false);
                        // jump to next unlocked child within this parent, else next parent
                        const list = activeChildren;
                        const idx = list.findIndex((c) => c.id === activeChild?.id);
                        const next = list
                          .slice(idx + 1)
                          .find((c) => !isChildLocked(c));
                        if (next) {
                          setActiveChildId(next.id);
                        } else {
                          const pIdx = parents.findIndex(
                            (p) => p.id === activeParent?.id,
                          );
                          const nextParent = parents[pIdx + 1];
                          if (nextParent) selectParent(nextParent.id);
                        }
                      }}
                      style={{
                        background: T.ember,
                        border: "none",
                        color: T.white,
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
