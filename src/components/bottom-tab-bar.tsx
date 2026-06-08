import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardCheck, FileBarChart, Settings } from "lucide-react";

const T = {
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  ember: "#F05223",
  mid: "#888880",
};

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
      className="md:hidden"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: T.paper,
        borderTop: `1px solid ${T.offWhite}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "flex",
      }}
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const color = active ? T.ember : T.mid;
        return (
          <Link
            key={tab.label}
            to={tab.to}
            search={tab.search as any}
            style={{
              flex: 1,
              height: 56,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color,
              textDecoration: "none",
              fontSize: 10,
              fontWeight: active ? 600 : 500,
            }}
          >
            <tab.Icon size={20} color={color} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
