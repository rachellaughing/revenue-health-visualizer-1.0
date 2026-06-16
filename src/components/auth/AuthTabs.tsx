export type AuthTab = "signin" | "signup";

export function AuthTabs({
  active,
  onChange,
}: {
  active: AuthTab;
  onChange: (next: AuthTab) => void;
}) {
  return (
    <div className="mb-6">
      <h1
        className="text-5xl mb-2"
        style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}
      >
        Welcome
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--mm-mid)" }}>
        Sign in to continue, or create your account.
      </p>
      <div
        role="tablist"
        aria-label="Authentication"
        className="grid grid-cols-2 gap-2 p-1 rounded-md"
        style={{ backgroundColor: "var(--mm-off-white)", border: "1px solid #E5E5DF" }}
      >
        <TabButton active={active === "signin"} onClick={() => onChange("signin")}>
          Sign in
        </TabButton>
        <TabButton active={active === "signup"} onClick={() => onChange("signup")}>
          Create account
        </TabButton>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        backgroundColor: active ? "var(--mm-ink)" : "transparent",
        color: active ? "#FFFFFF" : "var(--mm-ink)",
      }}
    >
      {children}
    </button>
  );
}
