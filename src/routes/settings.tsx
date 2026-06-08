import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PersonalDetailsCard } from "@/components/settings/PersonalDetailsCard";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { BillingTab } from "@/components/settings/BillingTab";
import { TeamTab } from "@/components/settings/TeamTab";

type TabKey = "account" | "billing" | "team";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  validateSearch: (s: Record<string, unknown>) => {
    const raw = String(s.tab ?? "account");
    const tab: TabKey =
      raw === "billing" || raw === "team" ? raw : "account";
    return {
      tab,
      success: s.success === "true" || s.success === true ? true : undefined,
    };
  },
  component: SettingsPage,
});

const TABS: { key: TabKey; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "billing", label: "Billing & Plan" },
  { key: "team", label: "Team" },
];

function SettingsPage() {
  const { tab, success } = useSearch({ from: "/settings" });
  const navigate = useNavigate({ from: "/settings" });

  return (
    <div
      style={{
        background: "var(--mm-paper)",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "48px 32px", width: "100%", flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--mm-mid)", letterSpacing: "0.08em", marginBottom: 16 }}>
          SETTINGS
        </div>
        <h1
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 44,
            fontWeight: 400,
            color: "var(--mm-ink)",
            margin: "0 0 28px",
          }}
        >
          Settings
        </h1>

        {/* Tab strip */}
        <div
          role="tablist"
          style={{
            display: "flex",
            gap: 4,
            borderBottom: "1px solid #E5E5DF",
            marginBottom: 28,
          }}
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() =>
                  navigate({ search: (prev) => ({ ...prev, tab: t.key }) })
                }
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--mm-ink)" : "var(--mm-mid)",
                  borderBottom: `2px solid ${active ? "var(--mm-ember)" : "transparent"}`,
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "account" && (
          <div>
            <PersonalDetailsCard />
            <ChangePasswordCard />
          </div>
        )}
        {tab === "billing" && <BillingTab success={success} />}
        {tab === "team" && <TeamTab />}
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "24px 16px",
          fontSize: 12,
          color: "var(--mm-mid)",
        }}
      >
        © 2025 Marketplace Maven. All rights reserved.
      </footer>
    </div>
  );
}
