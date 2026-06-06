import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Revenue Health Visualiser" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required />
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
    </div>
  );
}

function Field({
  label, type, value, onChange, required,
}: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--mm-ink)" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        style={{ backgroundColor: "var(--mm-off-white)", borderColor: "#E5E5DF", color: "var(--mm-ink)" }}
      />
    </label>
  );
}
