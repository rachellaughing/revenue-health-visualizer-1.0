import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PersonalDetailsCard } from "@/components/settings/PersonalDetailsCard";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { BillingTab } from "@/components/settings/BillingTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { fetchViewerContextSafe } from "@/lib/viewer-query";

type TabKey = "account" | "billing" | "team";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: TabKey; success?: true } => {
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

const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "billing", label: "Billing & Plan" },
  { key: "team", label: "Team" },
];

function SettingsPage() {
  const { tab, success } = useSearch({ from: "/settings" });
  const navigate = useNavigate({ from: "/settings" });

  const viewerQ = useQuery({
    queryKey: ["viewer-context"],
    queryFn: fetchViewerContextSafe,
  });
  const isMember = viewerQ.data?.role === "team_member";
  const TABS = isMember
    ? ALL_TABS.filter((t) => t.key !== "team")
    : ALL_TABS;
  const activeTab: TabKey =
    isMember && tab === "team" ? "account" : (tab ?? "account");

  return (
    <div className="mm-settings">
      <main className="mm-settings__main">
        <div className="mm-settings__kicker">SETTINGS</div>
        <h1 className="mm-settings__title">Settings</h1>

        {/* Tab strip */}
        <div role="tablist" className="mm-tabs">
          {TABS.map((t) => {
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => navigate({ search: { tab: t.key } })}
                className={`mm-tab${active ? " mm-tab--active" : ""}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "account" && (
          <div>
            <PersonalDetailsCard />
            <ChangePasswordCard />
          </div>
        )}
        {activeTab === "billing" && <BillingTab success={success} />}
        {activeTab === "team" && !isMember && <TeamTab />}
      </main>

      <footer className="mm-settings__footer">
        © 2025 Marketplace Maven. All rights reserved.
      </footer>
    </div>
  );
}
