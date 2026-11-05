import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardCheck, FileBarChart, Settings } from "lucide-react";

type Tab = {
  label: string;
  to: string;
  search?: Record<string, string>;
  match: (pathname: string) => boolean;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const TABS: Tab[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    match: (p) => p === "/dashboard",
    Icon: LayoutDashboard,
  },
  {
    label: "Health Check",
    to: "/health-check",
    match: (p) => p === "/health-check" || p.startsWith("/health-check/"),
    Icon: ClipboardCheck,
  },
  {
    label: "Reports",
    to: "/reports/executive-summary",
    match: (p) => p.startsWith("/reports/"),
    Icon: FileBarChart,
  },
  {
    label: "Settings",
    to: "/settings",
    search: { tab: "account" },
    match: (p) => p === "/settings" || p.startsWith("/settings/"),
    Icon: Settings,
  },
];

export function BottomTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="mm-tabbar md:hidden"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.label}
            to={tab.to}
            search={tab.search as any}
            className={`mm-tabbar__item${active ? " mm-tabbar__item--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <tab.Icon size={20} color="currentColor" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
