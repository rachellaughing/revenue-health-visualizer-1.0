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
    <section className="mm-form-card">
      <h2 className="mm-form-card__title">Change Password</h2>
      <form onSubmit={onSubmit} className="mm-form-grid">
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
            className="mm-btn-ember"
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
    <label className="mm-field">
      <span className="mm-field__label">
        {label}
      </span>
      <div className="mm-input-wrap">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="new-password"
          className={`mm-input mm-input--pw${invalid ? " mm-input--invalid" : ""}`}
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
      {helper && (
        <p className="mm-field__error">{helper}</p>
      )}
    </label>
  );
}
