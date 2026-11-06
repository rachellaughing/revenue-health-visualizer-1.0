import { Link } from "@tanstack/react-router";
import type { ViewerContext } from "@/lib/viewer.functions";

export function TeamMemberDashboard({ viewer }: { viewer: ViewerContext }) {
  const tm = viewer.teamMember;
  if (!tm) return null;

  const ownerName = tm.ownerFirstName ?? "Your founder";
  const completed = tm.ownStatus === "completed";
  const inProgress = tm.ownStatus === "in_progress";

  if (completed) {
    return <CompletedCard viewer={viewer} />;
  }

  return (
    <div className="mm-tm-dash">
      <div className="mm-tm-dash__inner">
        <div className="mm-tm-hero">
          <div className="mm-tm-hero__glow" />
          <div className="mm-tm-hero__content">
            <div className="mm-tm-hero__kicker">TEAM HEALTH CHECK</div>
            <h1 className="mm-tm-hero__title">
              Complete your Health Check to unlock the Team Alignment report
              for {ownerName}'s organization.
            </h1>
            <Link to="/health-check" className="mm-tm-hero__cta">
              {inProgress ? "Continue Health Check →" : "Start Health Check →"}
            </Link>
          </div>
        </div>

        <div className="mm-tm-tiles">
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
    <div className="mm-tm-tile">
      <div className="mm-tm-tile__title">{title}</div>
      <div className="mm-tm-tile__body">{body}</div>
    </div>
  );
}

export function CompletedCard({ viewer }: { viewer: ViewerContext }) {
  const tm = viewer.teamMember!;
  const ownerName = tm.ownerFirstName ?? "Your founder";

  const submittedAt = tm.submittedAt ? new Date(tm.submittedAt) : new Date();
  const lockDate = new Date(submittedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lockDateStr = lockDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mm-tm-dash">
      <div className="mm-tm-dash__inner">
        <div className="mm-tm-hero">
          <div className="mm-tm-hero__kicker">✓ HEALTH CHECK COMPLETE</div>
          <h1 className="mm-tm-hero__title mm-tm-hero__title--done">
            Your responses have been added to the Team Alignment report.
          </h1>
          <p className="mm-tm-hero__body">
            {ownerName} can now see where your perspective adds to the
            leadership view. Your individual responses are always kept
            anonymous.
          </p>

          {tm.ownerEmail && (
            <a href={`mailto:${tm.ownerEmail}`} className="mm-tm-hero__mail">
              Questions? Contact {tm.ownerEmail}
            </a>
          )}
        </div>

        <p className="mm-tm-note">
          You can return to update your answers until {lockDateStr}. After that
          your responses will be locked.
        </p>
      </div>
    </div>
  );
}
