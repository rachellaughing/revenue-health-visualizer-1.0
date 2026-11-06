import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Revenue Health Visualizer™" },
      { name: "description", content: "Choose a new password for your Revenue Health Visualizer™ account." },
      { property: "og:title", content: "Reset password — Revenue Health Visualizer™" },
      { property: "og:description", content: "Choose a new password for your Revenue Health Visualizer™ account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
    <div className="mm-auth-page">
      <div className="mm-auth-box">
        <h1 className="mm-auth-title">Set a new password</h1>
        <p className="mm-auth-lede mb-8">
          Choose a new password for your Revenue Health Visualizer™ account.
        </p>

        {!ready && <p className="mm-auth-lede">Loading…</p>}

        {ready && !hasSession && !success && (
          <div className="space-y-4">
            <p className="mm-text-error">This reset link is invalid or has expired.</p>
            <Link to="/login" className="mm-link-eyebrow">
              ← Back to sign in
            </Link>
          </div>
        )}

        {ready && hasSession && !success && (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="New password" value={password} onChange={setPassword} required />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} required />
            {error && <p className="mm-text-error">{error}</p>}
            <button type="submit" disabled={saving} className="mm-btn-block">
              {saving ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {success && <p className="mm-auth-lede mm-text">Password updated. Redirecting to sign in…</p>}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, required,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className="mm-field">
      <span className="mm-field__label">{label}</span>
      <div className="mm-input-wrap">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="mm-input mm-input--pw"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="mm-input-toggle"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
