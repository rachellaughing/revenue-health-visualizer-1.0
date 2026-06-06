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
} from "lucide-react";
import { useState } from "react";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "HOME",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Personal Profile", url: "/personal-profile", icon: User },
      { title: "Company Profile", url: "/company-profile", icon: Building2 },
    ],
  },
  {
    label: "HEALTH CHECK",
    items: [
      { title: "Start / Resume", url: "/health-check/start", icon: PlayCircle },
      { title: "Health Check History", url: "/health-check/history", icon: History },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { title: "Executive Summary", url: "/reports/executive-summary", icon: FileText },
      { title: "Revenue System Health", url: "/reports/revenue-system-health", icon: Activity },
      { title: "Top Opportunities", url: "/reports/top-opportunities", icon: Target },
      { title: "Revenue at Risk", url: "/reports/revenue-at-risk", icon: AlertTriangle },
      { title: "Team Alignment", url: "/reports/team-alignment", icon: Users },
      { title: "Founder Dependency", url: "/reports/founder-dependency", icon: Crown },
    ],
  },
  {
    label: "REVENUE INTELLIGENCE",
    items: [
      { title: "Matrix Map", url: "/revenue/matrix-map", icon: Grid3x3 },
      { title: "Shadow Systems", url: "/revenue/shadow-systems", icon: Eye },
      { title: "Roadmap Builder", url: "/revenue/roadmap-builder", icon: Map },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { title: "Account", url: "/settings/account", icon: Settings },
      { title: "Billing & Plan", url: "/settings/billing", icon: CreditCard },
      { title: "Team", url: "/settings/team", icon: UserCog },
    ],
  },
];

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((s) => [s.label, true])),
  );

  const toggle = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
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
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="font-display text-lg"
          style={{ color: "#FFFEFA", opacity: collapsed ? 0 : 1 }}
        >
          Revenue Health
        </span>
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
                    const active = pathname === item.url;
                    const Icon = item.icon;
                    return (
                      <li key={item.url}>
                        <Link
                          to={item.url}
                          className="relative flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{
                            color: active ? "#FFFFFF" : "rgba(255,255,255,0.7)",
                            backgroundColor: active ? "rgba(255,255,255,0.05)" : "transparent",
                            borderLeft: active
                              ? "3px solid var(--mm-ember)"
                              : "3px solid transparent",
                            paddingLeft: active ? "calc(1rem - 3px)" : "1rem",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
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
  );
}
