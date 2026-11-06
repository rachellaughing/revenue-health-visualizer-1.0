import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui-mm";
import {
  listTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  resendTeamInvite,
} from "@/lib/team.functions";

import {
  createProCheckoutSession,
  getCurrentTier,
} from "@/lib/stripe-checkout.functions";

export function TeamTab() {
  const tierFn = useServerFn(getCurrentTier);
  const tierQ = useQuery({ queryKey: ["current-tier"], queryFn: () => tierFn() });
  const tier = tierQ.data?.tier ?? "starter";
  const unlocked = tier === "pro" || tier === "diagnostic";

  if (!unlocked) return <LockedTeamPanel />;
  return <ActiveTeamPanel tier={tier} />;
}

function LockedTeamPanel() {
  const checkoutFn = useServerFn(createProCheckoutSession);
  const checkout = useMutation({
    mutationFn: () => checkoutFn(),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  return (
    <div className="mm-team-locked">
      <div className="mm-team-locked__blur" aria-hidden>
        <ActiveTeamPanel tier="starter" preview />
      </div>
      <div className="mm-team-locked__scrim">
        <div className="mm-team-locked__box">
          <div className="mm-team-locked__icon">
            <Lock size={20} />
          </div>
          <h3 className="mm-team-locked__title">
            Team collaboration is available in Revenue Health Assessment™ and above
          </h3>
          <p className="mm-team-locked__body">
            Invite teammates to complete the Health Check and unlock the Team Alignment report.
          </p>
          <button
            type="button"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            className="mm-btn-ember"
          >
            {checkout.isPending ? "Redirecting…" : "Upgrade to unlock team features"}
          </button>
          {checkout.error && (
            <div className="mm-field__error mm-mt-sm">{(checkout.error as Error).message}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveTeamPanel({ tier, preview = false }: { tier: string; preview?: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTeamMembers);
  const inviteFn = useServerFn(inviteTeamMember);
  const removeFn = useServerFn(removeTeamMember);
  const resendFn = useServerFn(resendTeamInvite);


  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listFn(),
    enabled: !preview,
  });

  const [email, setEmail] = useState("");

  const invite = useMutation({
    mutationFn: (e: string) => inviteFn({ data: { email: e, origin: window.location.origin } }),
    onSuccess: (r) => {
      toast.success(`Invite sent to ${r.email}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Team member removed");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resend = useMutation({
    mutationFn: (id: string) =>
      resendFn({ data: { id, origin: window.location.origin } }),
    onSuccess: (r) => toast.success(`Invite resent to ${r.email}`),
    onError: (e: Error) => toast.error(e.message),
  });


  const demoMembers = preview
    ? [
        { id: "1", email: "alex@example.com", display_name: "Alex Carter", initials: "AC", status: "Completed", completed_at: null },
        { id: "2", email: "sam@example.com", display_name: "Sam Patel", initials: "SP", status: "In progress", completed_at: null },
        { id: "3", email: "jordan@example.com", display_name: "Jordan Lee", initials: "JL", status: "Joined", completed_at: null },
        { id: "4", email: "riley@example.com", display_name: "Riley Kim", initials: "RK", status: "Invited", completed_at: null },
      ]
    : members;

  const isDiag = tier === "diagnostic";

  return (
    <div className="mm-stack mm-gap-lg">
      <section className="mm-team-card">
        <h2 className="mm-team-h2">Invite a team member</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            invite.mutate(email.trim());
          }}
          className="mm-team-form"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            aria-label="Teammate email"
            disabled={preview}
            className="mm-input"
          />
          <button
            type="submit"
            disabled={preview || invite.isPending || !email.trim()}
            className="mm-btn-ember"
          >
            {invite.isPending ? "Sending…" : "Send Invite"}
          </button>
        </form>
      </section>

      <section className="mm-team-card">
        <h2 className="mm-team-h2">Team members</h2>
        {isLoading && !preview ? (
          <p className="text-sm mm-muted">Loading…</p>
        ) : demoMembers.length === 0 ? (
          <p className="text-sm mm-muted">
            No team members yet. Invite your team to get started with the Team Alignment report.
          </p>
        ) : (
          <ul className="mm-team-list">
            {demoMembers.map((m: any) => (
              <li key={m.id} className="mm-team-row">
                <div className="mm-team-who">
                  <div className="mm-team-avatar">{m.initials}</div>
                  <div className="mm-flex-1">
                    <div className="mm-team-name">{m.display_name || m.email}</div>
                    {m.display_name && <div className="mm-team-email">{m.email}</div>}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[m.status as string] ?? "warning"}>
                  {String(m.status).toUpperCase()}
                </Badge>
                <div className="mm-team-actions">
                  {m.status === "Invited" && (
                    <button
                      type="button"
                      onClick={() => resend.mutate(m.id)}
                      disabled={preview || resend.isPending}
                      className="mm-team-btn mm-team-btn--link"
                    >
                      {resend.isPending ? "Sending…" : "Resend"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove.mutate(m.id)}
                    disabled={preview || remove.isPending}
                    className="mm-team-btn"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mm-callout-info">
        Team members complete the Health Check independently. Their responses are anonymized in your Team Alignment report.
        {isDiag && " Your Diagnostic includes a facilitated PBJ session with your team."}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, "success" | "info" | "neutral" | "warning"> = {
  Completed: "success",
  "In progress": "info",
  Joined: "neutral",
  Invited: "warning",
};
