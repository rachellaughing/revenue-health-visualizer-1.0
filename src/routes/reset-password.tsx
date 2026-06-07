import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Revenue Health Visualiser" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase auto-detects the recovery token from the URL hash and creates a session.
    // Listen for the PASSWORD_RECOVERY event, then check session presence.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setHasSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setError(error.message);
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login" }), 1800);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--mm-paper)" }}>
      <div className="w-full max-w-md">
        <h1 className="text-5xl mb-2" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}>
          Set a new password
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--mm-mid)" }}>
          Choose a new password for your Revenue Health Visualiser™ account.
        </p>

        {!ready && (
          <p className="text-sm" style={{ color: "var(--mm-mid)" }}>Loading…</p>
        )}

        {ready && !hasSession && !success && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--mm-ember)" }}>
              This reset link is invalid or has expired.
            </p>
            <Link to="/login" className="text-sm font-semibold" style={{ color: "var(--mm-ember)" }}>
              ← Back to sign in
            </Link>
          </div>
        )}

        {ready && hasSession && !success && (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="New password" value={password} onChange={setPassword} required />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} required />
            {error && <p className="text-sm" style={{ color: "var(--mm-ember)" }}>{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: "var(--mm-ember)" }}
            >
              {saving ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {success && (
          <p className="text-sm" style={{ color: "var(--mm-ink)" }}>
            Password updated. Redirecting to sign in…
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, required,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            backgroundColor: "var(--mm-off-white)",
            borderColor: "#E5E5DF",
            color: "var(--mm-ink)",
            paddingRight: 40,
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3"
          style={{ color: "var(--mm-mid)" }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
