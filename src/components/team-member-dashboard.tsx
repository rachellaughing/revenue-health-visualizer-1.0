import { Link } from "@tanstack/react-router";
import type { ViewerContext } from "@/lib/viewer.functions";

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

export function TeamMemberDashboard({ viewer }: { viewer: ViewerContext }) {
  const tm = viewer.teamMember;
  if (!tm) return null;

  const ownerName = tm.ownerFirstName ?? "Your founder";
  const company = tm.companyName ?? "their company";
  const completed = tm.ownStatus === "completed";
  const inProgress = tm.ownStatus === "in_progress";

  if (completed) {
    return <CompletedCard viewer={viewer} />;
  }

  return (
    <div
      style={{
        minHeight: "100%",
        background: T.paper,
        padding: "48px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div
          style={{
            background: T.abyss,
            borderRadius: 16,
            padding: "40px 36px",
            color: T.white,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 240,
              height: 240,
              background: `radial-gradient(circle, ${T.tealBright}18, transparent 70%)`,
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.tealBright,
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              TEAM HEALTH CHECK
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 30,
                fontWeight: 400,
                lineHeight: 1.2,
                margin: "0 0 28px",
              }}
            >
              Complete your Health Check to unlock the Team Alignment report
              for {ownerName}'s organization.
            </h1>
            <Link
              to="/health-check"
              style={{
                display: "inline-block",
                background: T.ember,
                color: T.white,
                padding: "14px 28px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {inProgress ? "Continue Health Check →" : "Start Health Check →"}
            </Link>
          </div>

        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginTop: 20,
          }}
        >
          <InfoTile title="Anonymous" body="Your individual scores are never shown to the founder" />
          <InfoTile title="15–20 mins" body="Estimated time to complete" />
          <InfoTile title="Quarterly" body="You may be invited again each quarter" />
        </div>
      </div>
    </div>
  );
}

function InfoTile({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.offWhite}`,
        borderRadius: 10,
        padding: "16px 14px",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: T.mid, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

export function CompletedCard({ viewer }: { viewer: ViewerContext }) {
  const tm = viewer.teamMember!;
  const ownerName = tm.ownerFirstName ?? "Your founder";
  const company = tm.companyName ?? "your company";
  const submittedAt = tm.submittedAt ? new Date(tm.submittedAt) : new Date();
  const lockDate = new Date(submittedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lockDateStr = lockDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{
        minHeight: "100%",
        background: T.paper,
        padding: "48px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div
          style={{
            background: T.abyss,
            borderRadius: 16,
            padding: "40px 36px",
            color: T.white,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.tealBright,
              letterSpacing: "0.12em",
              marginBottom: 16,
            }}
          >
            ✓ HEALTH CHECK COMPLETE
          </div>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.25,
              margin: "0 0 20px",
            }}
          >
            Your responses have been added to the Team Alignment report.
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.78)",
              margin: "0 0 24px",
            }}
          >
            {ownerName} can now see where your perspective adds to the
            leadership view. Your individual responses are always kept
            anonymous.
          </p>

          {tm.ownerEmail && (
            <a
              href={`mailto:${tm.ownerEmail}`}
              style={{
                fontSize: 13,
                color: T.tealBright,
                textDecoration: "none",
                borderBottom: `1px solid ${T.tealBright}40`,
              }}
            >
              Questions? Contact {tm.ownerEmail}
            </a>
          )}
        </div>

        <p
          style={{
            marginTop: 18,
            fontSize: 12,
            color: T.mid,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          You can return to update your answers until {lockDateStr}. After that
          your responses will be locked.
        </p>
      </div>
    </div>
  );
}
