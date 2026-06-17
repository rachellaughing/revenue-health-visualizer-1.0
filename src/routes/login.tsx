import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import {
  PasswordRequirements,
  allRulesMet,
} from "@/components/settings/PasswordRequirements";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Revenue Health Visualiser" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    verified: search.verified === "1" || search.verified === 1 ? true : undefined,
    tab: search.tab === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <AuthTabs active={tab} onChange={setTab} />
        {tab === "signin" ? <SignInForm /> : <SignUpForm />}
      </div>
    </AuthSplitLayout>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const { verified } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <>
      {verified && (
        <div
          className="mb-6 rounded-md px-4 py-3 text-sm"
          style={{ backgroundColor: "#E8F5E9", color: "#1B5E20", border: "1px solid #C8E6C9" }}
          role="status"
        >
          Email verified — sign in to continue.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--mm-ember)" }}
          >
            Forgot password?
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--mm-ember)" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
          style={{ backgroundColor: "var(--mm-ember)" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        initialEmail={email}
      />
    </>
  );
}

function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwBlurInvalid, setPwBlurInvalid] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  const rulesMet = allRulesMet(password);
  const canSubmit =
    rulesMet &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`,
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          business_name: businessName || null,
        },
      },
    });
    setLoading(false);
    if (error) return setError(error.message);

    // Fire-and-forget GHL signup webhook (do not block UI on result).
    try {
      void fetch(
        "https://services.leadconnectorhq.com/hooks/srok4ARuusOq59OlGRRs/webhook-trigger/3794cbdf-5a0c-4c0b-aa46-2ba67918fff6",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "signup",
            first_name: firstName,
            last_name: lastName,
            email,
            company_name: businessName || "",
            signup_date: new Date().toISOString(),
            tier: "snapshot",
            health_check_status: "not_started",
            diagnostic_requested: "",
          }),
        },
      ).catch(() => {});
    } catch {
      // swallow
    }

    setSubmitted(true);
  }


  async function onResend() {
    if (resendState === "sending") return;
    setResendState("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/login?verified=1` },
    });
    if (error) {
      setError(error.message);
      setResendState("idle");
      return;
    }
    setResendState("sent");
  }

  if (submitted) {
    return (
      <div>
        <h2
          className="text-3xl mb-2"
          style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
        >
          Check your email
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--mm-mid)" }}>
          We sent a verification link to{" "}
          <strong style={{ color: "var(--mm-ink)" }}>{email}</strong>. Click the link to activate
          your account, then sign in to continue.
        </p>
        <p className="text-xs mb-8" style={{ color: "var(--mm-mid)" }}>
          Didn't get it? Check your spam folder, or resend below.
        </p>
        <button
          type="button"
          onClick={onResend}
          disabled={resendState !== "idle"}
          className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
          style={{ backgroundColor: "var(--mm-ember)" }}
        >
          {resendState === "sending"
            ? "Sending…"
            : resendState === "sent"
              ? "Verification email resent"
              : "Resend verification email"}
        </button>
        {error && (
          <p className="text-sm mt-3" style={{ color: "var(--mm-ember)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" type="text" value={firstName} onChange={setFirstName} required />
        <Field label="Last name" type="text" value={lastName} onChange={setLastName} required />
      </div>
      <Field label="Email" type="email" value={email} onChange={setEmail} required />

      <label className="block">
        <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>
          Password
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

      <Field
        label="Business name (optional)"
        type="text"
        value={businessName}
        onChange={setBusinessName}
      />
      {error && <p className="text-sm" style={{ color: "var(--mm-ember)" }}>{error}</p>}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
        style={{
          backgroundColor: "var(--mm-ember)",
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useState(() => setEmail(initialEmail));

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setSent(false);
        setErr(null);
      }, 200);
    } else {
      setEmail(initialEmail);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ backgroundColor: "var(--mm-paper)" }}>
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 28,
              color: "var(--mm-ink)",
            }}
          >
            Reset your password
          </DialogTitle>
          <DialogDescription style={{ color: "var(--mm-mid)" }}>
            {sent
              ? `If an account exists for ${email}, we've sent a password reset link. Check your inbox.`
              : "Enter your email and we'll send you a link to reset your password."}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={handleSend} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            {err && <p className="text-sm" style={{ color: "var(--mm-ember)" }}>{err}</p>}
            <button
              type="submit"
              disabled={sending || !email}
              className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--mm-ember)" }}
            >
              {sending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        {sent && (
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="w-full rounded-md px-4 py-3 text-white font-semibold"
            style={{ backgroundColor: "var(--mm-ember)" }}
          >
            Done
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;

  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>
        {label}
      </span>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            backgroundColor: "var(--mm-off-white)",
            borderColor: "#E5E5DF",
            color: "var(--mm-ink)",
            paddingRight: isPassword ? 40 : undefined,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3"
            style={{ color: "var(--mm-mid)" }}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

