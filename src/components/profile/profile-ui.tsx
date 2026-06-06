import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const ProgressSteps = ({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) => (
  <div className="flex items-center mb-8">
    {steps.map((step, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <div
          key={i}
          className="flex items-center"
          style={{ flex: i < steps.length - 1 ? 1 : 0 }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{
                background: done
                  ? "var(--mm-teal-bright)"
                  : active
                    ? "var(--mm-abyss)"
                    : "var(--mm-off-white)",
                border: `2px solid ${done ? "var(--mm-teal-bright)" : active ? "var(--mm-abyss)" : "rgba(0,0,0,0.12)"}`,
                color: done || active ? "#fff" : "var(--mm-mid)",
              }}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className="text-[11px] whitespace-nowrap"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? "var(--mm-ink)" : "var(--mm-mid)",
              }}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 mx-2 mb-[22px]"
              style={{
                height: 2,
                background: done ? "var(--mm-teal-bright)" : "var(--mm-off-white)",
              }}
            />
          )}
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
  <div
    className="rounded-xl p-7 mb-6"
    style={{
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 2px 8px rgba(24,40,41,0.05)",
    }}
  >
    <div
      className="pb-4 mb-5"
      style={{ borderBottom: "1px solid var(--mm-off-white)" }}
    >
      {subtitle && (
        <div
          className="text-[10px] font-bold mb-1"
          style={{ color: "var(--mm-mid)", letterSpacing: "0.12em" }}
        >
          {subtitle.toUpperCase()}
        </div>
      )}
      <h3
        className="text-[17px] m-0"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: "var(--mm-ink)" }}
      >
        {title}
      </h3>
    </div>
    {children}
  </div>
);

export const FieldGroup = ({
  children,
  columns = 1,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) => (
  <div
    className="grid gap-5 mb-5"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {children}
  </div>
);

export const Field = ({ children }: { children: ReactNode }) => <div>{children}</div>;

export const Label = ({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) => (
  <div
    className="text-xs font-semibold mb-1.5"
    style={{ color: "var(--mm-ink)", letterSpacing: "0.02em" }}
  >
    {children} {required && <span style={{ color: "var(--mm-ember)" }}>*</span>}
  </div>
);

export const Helper = ({ children }: { children: ReactNode }) => (
  <div
    className="text-[11px] mt-1 leading-relaxed"
    style={{ color: "var(--mm-mid)" }}
  >
    {children}
  </div>
);

const fieldBase: React.CSSProperties = {
  width: "100%",
  background: "var(--mm-off-white)",
  border: "1.5px solid transparent",
  borderRadius: 8,
  padding: "11px 14px",
  fontSize: 14,
  color: "var(--mm-ink)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...fieldBase, ...(props.style ?? {}) }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--mm-teal)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...fieldBase, resize: "vertical", lineHeight: 1.6, ...(props.style ?? {}) }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--mm-teal)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
    />
  );
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...fieldBase,
        appearance: "none",
        cursor: "pointer",
        color: value ? "var(--mm-ink)" : "var(--mm-mid)",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888880' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
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
    <button
      type={type}
      onClick={onClick}
      disabled={!enabled}
      className="text-sm font-semibold rounded-lg transition-all"
      style={{
        background: enabled ? "var(--mm-ember)" : "var(--mm-off-white)",
        color: enabled ? "#fff" : "var(--mm-mid)",
        padding: "13px 28px",
        border: "none",
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
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
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium rounded-lg"
      style={{
        background: "transparent",
        border: "1.5px solid var(--mm-teal)",
        color: "var(--mm-teal)",
        padding: "12px 22px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
