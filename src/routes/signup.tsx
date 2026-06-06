import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Revenue Health Visualiser" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
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
    navigate({ to: "/profile/personal" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ backgroundColor: "var(--mm-paper)" }}>
      <div className="w-full max-w-md">
        <h1 className="text-5xl mb-2" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}>
          Create your account
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--mm-mid)" }}>
          Start your Revenue Health Visualiser™ journey.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} required />
            <Field label="Last name" value={lastName} onChange={setLastName} required />
          </div>
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required />
          <Field label="Business name (optional)" value={businessName} onChange={setBusinessName} />
          {error && <p className="text-sm" style={{ color: "var(--mm-ember)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--mm-ember)" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm" style={{ color: "var(--mm-mid)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--mm-ember)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, type = "text", value, onChange, required,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
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
