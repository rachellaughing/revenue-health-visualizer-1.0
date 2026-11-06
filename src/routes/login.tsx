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
  head: () => ({
    meta: [
      { title: "Sign in — Revenue Health Visualizer™" },
      { name: "description", content: "Sign in or create your account to run your Revenue Health Check." },
      { property: "og:title", content: "Sign in — Revenue Health Visualizer™" },
      { property: "og:description", content: "Sign in or create your account to run your Revenue Health Check." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { verified?: true; tab?: "signin" | "signup" } => ({
    verified: search.verified === "1" || search.verified === 1 ? true : undefined,
    tab: search.tab === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { tab: rawTab } = Route.useSearch();
  const initialTab: AuthTab = rawTab ?? "signin";
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
        <div className="mm-notice--success mm-mb-lg" role="status">
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
            className="mm-link-eyebrow font-medium"
          >
            Forgot password?
          </button>
        </div>
        {error && <p className="mm-text-error">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mm-btn-block"
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
        <h2 className="mm-auth-title mm-auth-title--sm">
          Check your email
        </h2>
        <p className="mm-auth-lede mm-mb-lg">
          We sent a verification link to{" "}
          <strong className="mm-text">{email}</strong>. Click the link to activate
          your account, then sign in to continue.
        </p>
        <p className="mm-auth-lede text-xs mm-mb-2xl">
          Didn't get it? Check your spam folder, or resend below.
        </p>
        <button
          type="button"
          onClick={onResend}
          disabled={resendState !== "idle"}
          className="mm-btn-block"
        >
          {resendState === "sending"
            ? "Sending…"
            : resendState === "sent"
              ? "Verification email resent"
              : "Resend verification email"}
        </button>
        {error && (
          <p className="mm-text-error mm-mt-sm">
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

      <label className="mm-field">
        <span className="mm-field__label">Password</span>
        <div className="mm-input-wrap">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (pwBlurInvalid && allRulesMet(e.target.value)) setPwBlurInvalid(false);
            }}
            onBlur={() => setPwBlurInvalid(password.length > 0 && !allRulesMet(password))}
            required
            className={`mm-input mm-input--pw${pwBlurInvalid ? " mm-input--invalid" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="mm-input-toggle"
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
      {error && <p className="mm-text-error">{error}</p>}
      <button
        type="submit"
        disabled={!canSubmit}
        className="mm-btn-block"
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
      <DialogContent className="mm-dialog-surface">
        <DialogHeader>
          <DialogTitle className="mm-dialog-title">
            Reset your password
          </DialogTitle>
          <DialogDescription className="mm-muted">
            {sent
              ? `If an account exists for ${email}, we've sent a password reset link. Check your inbox.`
              : "Enter your email and we'll send you a link to reset your password."}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={handleSend} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            {err && <p className="mm-text-error">{err}</p>}
            <button
              type="submit"
              disabled={sending || !email}
              className="mm-btn-block"
            >
              {sending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        {sent && (
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="mm-btn-block"
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
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      <div className="mm-input-wrap">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={`mm-input${isPassword ? " mm-input--pw" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="mm-input-toggle"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

