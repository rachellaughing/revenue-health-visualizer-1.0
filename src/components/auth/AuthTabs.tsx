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
        className="mb-2 font-display text-5xl text-[var(--mm-text)]"
      >
        Welcome
      </h1>
      <p className="mb-6 text-sm text-[var(--mm-text-muted)]">
        Sign in to continue, or create your account.
      </p>
      <div
        role="tablist"
        aria-label="Authentication"
        className="grid grid-cols-2 gap-2 rounded-md border border-[var(--mm-border-subtle)] bg-[var(--mm-surface-sunken)] p-1"
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
      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-[var(--mm-abyss)] text-[var(--mm-on-dark)]" : "bg-transparent text-[var(--mm-text)]"}`}
    >
      {children}
    </button>
  );
}
