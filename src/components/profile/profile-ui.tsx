import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export const ProgressSteps = ({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) => (
  <div className="mm-steps">
    {steps.map((step, i) => {
      const done = i < current;
      const active = i === current;
      const cls = [
        "mm-step",
        i < steps.length - 1 && "mm-step--grow",
        done && "mm-step--done",
        active && "mm-step--active",
      ]
        .filter(Boolean)
        .join(" ");
      return (
        <div key={i} className={cls}>
          <div className="mm-step__col">
            <div className="mm-step__dot">{done ? "✓" : i + 1}</div>
            <span className="mm-step__label">{step}</span>
          </div>
          {i < steps.length - 1 && <div className="mm-step__line" />}
        </div>
      );
    })}
  </div>
);

export const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <div className="mm-section-card">
    <div className="mm-section-card__head">
      {subtitle && <div className="mm-section-card__kicker">{subtitle.toUpperCase()}</div>}
      <h3 className="mm-section-card__title">{title}</h3>
    </div>
    {children}
  </div>
);

const COLS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

export const FieldGroup = ({
  children,
  columns = 1,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) => <div className={`grid gap-5 mb-5 ${COLS[columns]}`}>{children}</div>;

export const Field = ({ children }: { children: ReactNode }) => <div>{children}</div>;

export const Label = ({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) => (
  <div className="mm-pf-label">
    {children} {required && <span className="mm-pf-req">*</span>}
  </div>
);

export const Helper = ({ children }: { children: ReactNode }) => (
  <div className="mm-pf-help">{children}</div>
);

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mm-pf-input${className ? ` ${className}` : ""}`} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`mm-pf-input${className ? ` ${className}` : ""}`} />;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="mm-pf-select-wrap">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mm-pf-input mm-pf-select${value ? "" : " mm-pf-select--empty"}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="mm-pf-select-icon" aria-hidden />
    </div>
  );
}

export function PrimaryButton({
  enabled,
  children,
  onClick,
  type = "button",
}: {
  enabled: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={!enabled} className="mm-btn-primary">
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="mm-btn-ghost">
      {children}
    </button>
  );
}
