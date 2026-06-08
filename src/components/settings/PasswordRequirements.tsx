import { Check, Circle } from "lucide-react";

export type PasswordRules = {
  length: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
};

export function checkPasswordRules(pw: string): PasswordRules {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[!@#$%^&*]/.test(pw),
  };
}

export function allRulesMet(pw: string): boolean {
  const r = checkPasswordRules(pw);
  return r.length && r.upper && r.digit && r.special;
}

const ITEMS: { key: keyof PasswordRules; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "upper", label: "One uppercase letter (A–Z)" },
  { key: "digit", label: "One number (0–9)" },
  { key: "special", label: "One special character (!@#$%^&*)" },
];

export function PasswordRequirements({ password }: { password: string }) {
  const rules = checkPasswordRules(password);
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: 13 }}>
      {ITEMS.map((it) => {
        const ok = rules[it.key];
        return (
          <li
            key={it.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 0",
              color: ok ? "#2BB457" : "var(--mm-mid)",
            }}
          >
            {ok ? (
              <Check size={14} strokeWidth={3} />
            ) : (
              <Circle size={10} fill="currentColor" />
            )}
            <span>{it.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
