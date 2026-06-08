import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
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
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none" }}>
        <ActiveTeamPanel tier="starter" preview />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(24,40,41,0.55)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#FFFEFA",
            borderRadius: 14,
            padding: "32px 36px",
            maxWidth: 420,
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#F5F5F0",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Lock size={20} color="var(--mm-mid)" />
          </div>
          <h3
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 24,
              margin: "0 0 10px",
              color: "var(--mm-ink)",
              fontWeight: 400,
            }}
          >
            Team collaboration is available in Revenue Health Assessment™ and above
          </h3>
          <p style={{ fontSize: 14, color: "var(--mm-mid)", margin: "0 0 20px" }}>
            Invite teammates to complete the Health Check and unlock the Team Alignment report.
          </p>
          <button
            type="button"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            style={{
              background: "var(--mm-ember)",
              color: "#FFFFFF",
              border: "none",
              padding: "12px 24px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: checkout.isPending ? "wait" : "pointer",
            }}
          >
            {checkout.isPending ? "Redirecting…" : "Upgrade to unlock team features"}
          </button>
          {checkout.error && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#C0392B" }}>
              {(checkout.error as Error).message}
            </div>
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
    <div style={{ display: "grid", gap: 20 }}>
      <section style={card}>
        <h2 style={h2}>Invite a team member</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            invite.mutate(email.trim());
          }}
          style={{ display: "flex", gap: 10 }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            disabled={preview}
            style={{
              flex: 1,
              borderRadius: 8,
              border: "1px solid #E5E5DF",
              padding: "10px 12px",
              fontSize: 14,
              background: "var(--mm-off-white)",
              color: "var(--mm-ink)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={preview || invite.isPending || !email.trim()}
            style={{
              background: "var(--mm-ember)",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: invite.isPending ? "wait" : "pointer",
              opacity: !email.trim() || invite.isPending ? 0.6 : 1,
            }}
          >
            {invite.isPending ? "Sending…" : "Send Invite"}
          </button>
        </form>
      </section>

      <section style={card}>
        <h2 style={h2}>Team members</h2>
        {isLoading && !preview ? (
          <p style={{ color: "var(--mm-mid)", fontSize: 14 }}>Loading…</p>
        ) : demoMembers.length === 0 ? (
          <p style={{ color: "var(--mm-mid)", fontSize: 14 }}>
            No team members yet. Invite your team to get started with the Team Alignment report.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {demoMembers.map((m: any) => (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  border: "1px solid #F0EFEA",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--mm-teal)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {m.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--mm-ink)", fontWeight: 500 }}>
                    {m.display_name || m.email}
                  </div>
                  {m.display_name && (
                    <div style={{ fontSize: 12, color: "var(--mm-mid)" }}>{m.email}</div>
                  )}
                </div>
                {(() => {
                  const palette: Record<string, { bg: string; fg: string }> = {
                    Completed: { bg: "#E8F5E9", fg: "#1B5E20" },
                    "In progress": { bg: "#E0F2F1", fg: "#00695C" },
                    Joined: { bg: "#E3F2FD", fg: "#0D47A1" },
                    Invited: { bg: "#FFF4E5", fg: "#8A5A00" },
                  };
                  const c = palette[m.status as string] ?? palette.Invited;
                  return (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: c.bg,
                        color: c.fg,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {String(m.status).toUpperCase()}
                    </span>
                  );
                })()}
                {m.status === "Invited" && (
                  <button
                    type="button"
                    onClick={() => resend.mutate(m.id)}
                    disabled={preview || resend.isPending}
                    style={{
                      background: "transparent",
                      border: "1px solid #E5E5DF",
                      color: "var(--mm-teal)",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: resend.isPending ? "wait" : "pointer",
                    }}
                  >
                    {resend.isPending ? "Sending…" : "Resend"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(m.id)}
                  disabled={preview || remove.isPending}
                  style={{
                    background: "transparent",
                    border: "1px solid #E5E5DF",
                    color: "var(--mm-mid)",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>

              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        style={{
          background: "#FFF7E0",
          border: "1px solid #F0D78C",
          borderRadius: 12,
          padding: "16px 20px",
          fontSize: 13,
          color: "#6B4E00",
          lineHeight: 1.6,
        }}
      >
        Team members complete the Health Check independently. Their responses are anonymised in your Team Alignment report.
        {isDiag && " Your Diagnostic includes a facilitated PBJ session with your team."}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #F0EFEA",
  borderRadius: 14,
  padding: "24px 28px",
};

const h2: React.CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: 22,
  margin: "0 0 16px",
  color: "var(--mm-ink)",
  fontWeight: 400,
};
