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
    <ul className="m-0 mt-2 list-none p-0 text-[13px]">
      {ITEMS.map((it) => {
        const ok = rules[it.key];
        return (
          <li
            key={it.key}
            className={`flex items-center gap-2 py-[3px] ${ok ? "text-[var(--mm-status-success)]" : "text-[var(--mm-text-muted)]"}`}
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
