import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Revenue Health Visualiser" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    verified: search.verified === "1" || search.verified === 1 ? true : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
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
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--mm-paper)" }}>
      <div className="w-full max-w-md">
        <h1 className="text-5xl mb-2" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}>
          Sign in
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--mm-mid)" }}>
          Welcome back to your Revenue Health Visualiser™.
        </p>
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
        <p className="mt-6 text-sm" style={{ color: "var(--mm-mid)" }}>
          No account?{" "}
          <Link to="/signup" style={{ color: "var(--mm-ember)", fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>

      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        initialEmail={email}
      />
    </div>
  );
}

function ForgotPasswordDialog({
  open, onOpenChange, initialEmail,
}: { open: boolean; onOpenChange: (v: boolean) => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // keep modal email in sync when reopened with a new initial value
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
      // reset state on close
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
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: "var(--mm-ink)" }}>
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
  label, type, value, onChange, required,
}: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;

  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>{label}</span>
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
