import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  PasswordRequirements,
  allRulesMet,
} from "@/components/settings/PasswordRequirements";
import {
  getInviteContext,
  activateTeamMembership,
} from "@/lib/team.functions";

export const Route = createFileRoute("/join-team")({
  head: () => ({ meta: [{ title: "Join your team — Revenue Health Visualiser" }] }),
  component: JoinTeamPage,
});

type Ctx = Awaited<ReturnType<typeof getInviteContext>>;

function JoinTeamPage() {
  const navigate = useNavigate();
  const getCtx = useServerFn(getInviteContext);
  const activate = useServerFn(activateTeamMembership);

  const [phase, setPhase] = useState<"loading" | "no-session" | "ready" | "no-invite" | "done">("loading");
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBlurInvalid, setPwBlurInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Supabase exchanges the invite token from the URL hash on mount.
      // Wait briefly for a session if not yet present.
      let session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        await new Promise<void>((resolve) => {
          const { data } = supabase.auth.onAuthStateChange((_e, s) => {
            if (s) {
              session = s;
              data.subscription.unsubscribe();
              resolve();
            }
          });
          setTimeout(() => {
            data.subscription.unsubscribe();
            resolve();
          }, 3000);
        });
        session = (await supabase.auth.getSession()).data.session;
      }
      if (cancelled) return;
      if (!session) {
        setPhase("no-session");
        return;
      }
      try {
        const c = await getCtx();
        if (cancelled) return;
        setCtx(c);
        if (!c.hasInvite) {
          setPhase("no-invite");
          return;
        }
        if (c.alreadyActivated) {
          navigate({ to: "/dashboard" });
          return;
        }
        setPhase("ready");
      } catch (e: any) {
        setError(e?.message ?? "Failed to load invite");
        setPhase("no-invite");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [getCtx, navigate]);

  const rulesMet = allRulesMet(password);
  const canSubmit =
    rulesMet &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({
        password,
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
        },
      });
      if (pwErr) throw pwErr;
      await activate({ data: { firstName: firstName.trim(), lastName: lastName.trim() } });
      navigate({ to: "/profile/company" });
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setSubmitting(false);
    }
  }

  const page = (children: React.ReactNode) => (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--mm-paper)" }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  if (phase === "loading") {
    return page(
      <p className="text-sm" style={{ color: "var(--mm-mid)" }}>
        Verifying your invite…
      </p>,
    );
  }

  if (phase === "no-session") {
    return page(
      <>
        <h1
          className="text-5xl mb-2"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
        >
          Invite link expired
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--mm-mid)" }}>
          Your invite link is no longer valid. Ask the person who invited you to send a new one.
        </p>
        <Link
          to="/login"
          className="block w-full rounded-md px-4 py-3 font-semibold text-center"
          style={{ border: "1px solid #E5E5DF", color: "var(--mm-ink)" }}
        >
          Back to sign in
        </Link>
      </>,
    );
  }

  if (phase === "no-invite") {
    return page(
      <>
        <h1
          className="text-5xl mb-2"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
        >
          No pending invite
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--mm-mid)" }}>
          We couldn't find a team invite for your email. {error ? `(${error})` : ""}
        </p>
        <Link
          to="/dashboard"
          className="block w-full rounded-md px-4 py-3 text-white font-semibold text-center"
          style={{ backgroundColor: "var(--mm-ember)" }}
        >
          Go to dashboard
        </Link>
      </>,
    );
  }

  // ready
  const companyLine =
    ctx?.hasInvite && ctx.companyName
      ? ctx.companyName
      : ctx?.hasInvite && ctx.teamName
        ? ctx.teamName
        : "your team";

  return page(
    <>
      <h1
        className="text-5xl mb-2"
        style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
      >
        Join {companyLine}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--mm-mid)" }}>
        You've been invited to a Revenue Health Diagnostic™ team. Set up your account to continue.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <ReadOnly label="Email" value={ctx?.email ?? ""} />
        <ReadOnly label="Company" value={companyLine} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={firstName} onChange={setFirstName} required />
          <Field label="Last name" value={lastName} onChange={setLastName} required />
        </div>

        <label className="block">
          <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>
            Set a password
          </span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (pwBlurInvalid && allRulesMet(e.target.value)) setPwBlurInvalid(false);
              }}
              onBlur={() => setPwBlurInvalid(password.length > 0 && !allRulesMet(password))}
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--mm-off-white)",
                borderColor: pwBlurInvalid ? "#E84F4F" : "#E5E5DF",
                color: "var(--mm-ink)",
                paddingRight: 40,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3"
              style={{ color: "var(--mm-mid)" }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordRequirements password={password} />
        </label>

        {error && (
          <p className="text-sm" style={{ color: "var(--mm-ember)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
          style={{
            backgroundColor: "var(--mm-ember)",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Joining…" : "Join team"}
        </button>
      </form>
    </>,
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        style={{
          backgroundColor: "var(--mm-off-white)",
          borderColor: "#E5E5DF",
          color: "var(--mm-ink)",
        }}
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        disabled
        className="w-full rounded-md border px-3 py-2 text-sm"
        style={{
          backgroundColor: "var(--mm-off-white)",
          borderColor: "#E5E5DF",
          color: "var(--mm-mid)",
        }}
      />
    </label>
  );
}
