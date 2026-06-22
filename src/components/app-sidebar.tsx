import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  Building2,
  PlayCircle,
  History,
  FileText,
  Activity,
  Target,
  AlertTriangle,
  Users,
  Crown,
  Grid3x3,
  Eye,
  Map,
  Settings,
  CreditCard,
  UserCog,
  ChevronDown,
  Lock,
  Stethoscope,
} from "lucide-react";


import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/lib/dashboard.functions";
import rhIconLight from "@/assets/rh-icon-light.svg.asset.json";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LockKind =
  | "profile"
  | "assessment_complete"
  | "two_assessments"
  | "pro_or_diagnostic"
  | "diagnostic"
  | null;

type NavItem = {
  title: string;
  url: string;
  search?: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
  lock?: LockKind;
  previewWhenLocked?: boolean;
};
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "HOME",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Personal Profile", url: "/profile/personal", icon: User },
      { title: "Company Profile", url: "/profile/company", icon: Building2 },
    ],
  },
  {
    label: "HEALTH CHECK",
    items: [
      { title: "Health Check", url: "/health-check", icon: PlayCircle, lock: "profile" },
      { title: "Health Check History", url: "/health-check/history", icon: History, lock: "two_assessments" },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { title: "Executive Summary", url: "/reports/executive-summary", icon: FileText, lock: "assessment_complete" },
      { title: "Revenue System Health", url: "/reports/revenue-system-health", icon: Activity, lock: "assessment_complete" },
      { title: "Top Opportunities", url: "/reports/top-opportunities", icon: Target, lock: "assessment_complete" },
      { title: "Revenue at Risk", url: "/reports/revenue-at-risk", icon: AlertTriangle, lock: "assessment_complete" },
      { title: "Team Alignment", url: "/reports/team-alignment", icon: Users, lock: "diagnostic", previewWhenLocked: true },
      { title: "Founder Dependency", url: "/reports/founder-dependency", icon: Crown, lock: "diagnostic" },
    ],
  },
  {
    label: "REVENUE INTELLIGENCE",
    items: [

      { title: "Matrix Map", url: "/revenue/matrix-map", icon: Grid3x3, lock: "assessment_complete" },
      { title: "Shadow Systems", url: "/revenue/shadow-systems", icon: Eye, lock: "diagnostic" },
      { title: "Roadmap Builder", url: "/revenue/roadmap-builder", icon: Map, lock: "diagnostic" },
      { title: "Diagnostic", url: "/diagnostic", icon: Stethoscope },
    ],
  },

  {
    label: "SETTINGS",
    items: [
      { title: "Account", url: "/settings", search: { tab: "account" }, icon: Settings },
      { title: "Billing & Plan", url: "/settings", search: { tab: "billing" }, icon: CreditCard },
      { title: "Team", url: "/settings", search: { tab: "team" }, icon: UserCog, lock: "pro_or_diagnostic" },
    ],
  },
];

const LOCK_REASON: Record<Exclude<LockKind, null>, string> = {
  profile: "Complete both profiles to unlock",
  assessment_complete: "Complete your Health Check to unlock",
  two_assessments: "Complete your next quarterly Health Check to unlock",
  pro_or_diagnostic: "Revenue Health Assessment™ or higher",
  diagnostic: "Revenue Health Diagnostic™",
};

function evalLock(
  lock: LockKind,
  gating: {
    profile_complete: boolean;
    company_profile_complete: boolean;
    assessment_status: string;
    completedCount: number;
    tier: string;
  } | null,
): boolean {
  if (!lock) return false;
  if (!gating) return false; // unknown — render as unlocked while loading
  switch (lock) {
    case "profile":
      return !(gating.profile_complete && gating.company_profile_complete);
    case "assessment_complete":
      return gating.assessment_status !== "complete" && gating.assessment_status !== "completed";
    case "two_assessments":
      return gating.completedCount < 2;
    case "pro_or_diagnostic":
      return gating.tier !== "pro" && gating.tier !== "diagnostic";
    case "diagnostic":
      return gating.tier !== "diagnostic";
  }
}

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((s) => [s.label, true])),
  );

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    staleTime: 30_000,
  });

  const gating = data?.profile
    ? {
        profile_complete: data.profile.profile_complete,
        company_profile_complete: data.profile.company_profile_complete,
        assessment_status: data.profile.assessment_status,
        completedCount: data.completedCount,
        tier: data.profile.tier,
      }
    : null;

  const toggle = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className="flex h-screen flex-col text-white transition-all duration-200"
        style={{
          backgroundColor: "var(--mm-abyss)",
          width: collapsed ? 64 : 240,
          minWidth: collapsed ? 64 : 240,
        }}
      >
        <div
          className="flex h-14 items-center px-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <img
            src={rhIconLight.url}
            alt="Revenue Health Visualiser"
            style={{ height: 32, width: "auto", display: "block" }}
          />
        </div>


        <nav className="flex-1 overflow-y-auto py-4">
          {sections.map((section) => {
            const isOpen = openSections[section.label];
            return (
              <div key={section.label} className="mb-2">
                {!collapsed && (
                  <button
                    onClick={() => toggle(section.label)}
                    className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-medium tracking-wider transition-colors hover:text-white/80"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className="h-3 w-3 transition-transform"
                      style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                    />
                  </button>
                )}
                {(isOpen || collapsed) && (
                  <ul className="mt-1">
                    {section.items.map((item) => {
                      const activeTab = item.search?.tab;
                      const currentTab = new URLSearchParams(searchStr || "").get("tab") ?? "account";
                      const active =
                        pathname === item.url &&
                        (activeTab ? currentTab === activeTab : true);
                      const locked = evalLock(item.lock ?? null, gating);
                      const Icon = item.icon;

                      const baseRow = (
                        <div
                          className="relative flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{
                            color: locked
                              ? "rgba(255,255,255,0.3)"
                              : active
                                ? "#FFFFFF"
                                : "rgba(255,255,255,0.7)",
                            backgroundColor: active && !locked ? "rgba(255,255,255,0.05)" : "transparent",
                            borderLeft:
                              active && !locked
                                ? "3px solid var(--mm-ember)"
                                : "3px solid transparent",
                            paddingLeft: active && !locked ? "calc(1rem - 3px)" : "1rem",
                            cursor: locked && !item.previewWhenLocked ? "not-allowed" : "pointer",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="truncate flex-1">{item.title}</span>
                              {locked && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
                            </>
                          )}
                        </div>
                      );

                      return (
                        <li key={item.title}>
                          {locked && !item.previewWhenLocked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block select-none">{baseRow}</span>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {LOCK_REASON[item.lock as Exclude<LockKind, null>]}
                              </TooltipContent>
                            </Tooltip>
                          ) : locked && item.previewWhenLocked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={item.url} search={item.search as any}>{baseRow}</Link>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {LOCK_REASON[item.lock as Exclude<LockKind, null>]} — preview available
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Link to={item.url} search={item.search as any}>{baseRow}</Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
