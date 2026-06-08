import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PasswordRequirements, allRulesMet } from "./PasswordRequirements";

export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [showNextBlurError, setShowNextBlurError] = useState(false);

  const rulesMet = allRulesMet(next);
  const match = next.length > 0 && next === confirm;
  const canSubmit = rulesMet && match && current.length > 0 && !pending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      if (!email) throw new Error("Not signed in");
      // Re-auth with current password before updating
      const reauth = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauth.error) throw new Error("Current password is incorrect");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
      setShowNextBlurError(false);
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
    } finally {
      setPending(false);
    }
  }

  return (
    <section style={cardStyle}>
      <h2 style={h2Style}>Change Password</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        <PasswordField label="Current password" value={current} onChange={setCurrent} />
        <div>
          <PasswordField
            label="New password"
            value={next}
            onChange={(v) => {
              setNext(v);
              if (showNextBlurError && allRulesMet(v)) setShowNextBlurError(false);
            }}
            onBlur={() => setShowNextBlurError(next.length > 0 && !rulesMet)}
            invalid={showNextBlurError}
          />
          <PasswordRequirements password={next} />
        </div>
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          invalid={confirm.length > 0 && !match}
          helper={confirm.length > 0 && !match ? "Passwords do not match" : undefined}
        />
        <div>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: "var(--mm-ember)",
              color: "#FFFFFF",
              border: "none",
              padding: "12px 24px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {pending ? "Updating…" : "Change Password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  invalid,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  helper?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--mm-ink)" }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="new-password"
          style={{
            width: "100%",
            borderRadius: 8,
            border: `1px solid ${invalid ? "#E84F4F" : "#E5E5DF"}`,
            padding: "10px 40px 10px 12px",
            fontSize: 14,
            background: "var(--mm-off-white)",
            color: "var(--mm-ink)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            inset: "0 0 0 auto",
            display: "flex",
            alignItems: "center",
            paddingInline: 10,
            background: "transparent",
            border: "none",
            color: "var(--mm-mid)",
            cursor: "pointer",
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {helper && (
        <p style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{helper}</p>
      )}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #F0EFEA",
  borderRadius: 14,
  padding: "28px 32px",
  marginTop: 20,
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: 26,
  margin: "0 0 20px",
  color: "var(--mm-ink)",
  fontWeight: 400,
};
