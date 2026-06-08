import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const T = {
  abyss: "#182829",
  paper: "#FFFEFA",
  offWhite: "#F5F5F0",
  mid: "#888880",
  white: "#FFFFFF",
  ember: "#F05223",
};

const ALLOWED_PREFIXES = ["/dashboard", "/health-check"];

export function TeamMemberShell({ firstName }: { firstName: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const allowed = ALLOWED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    if (!allowed) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [pathname, navigate]);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex h-screen w-full flex-col" style={{ background: T.paper }}>
      {/* Top bar */}
      <header
        style={{
          height: 60,
          flexShrink: 0,
          background: T.white,
          borderBottom: `1px solid ${T.offWhite}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 32,
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 18,
            color: T.abyss,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Revenue Health Visualiser<span style={{ fontSize: 10, verticalAlign: "super" }}>™</span>
        </Link>

        <nav style={{ display: "flex", gap: 24 }}>
          <Link
            to="/health-check"
            activeProps={{ style: { color: T.abyss, fontWeight: 600 } }}
            inactiveProps={{ style: { color: T.mid, fontWeight: 500 } }}
            style={{
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Health Check
          </Link>
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {firstName && (
            <span style={{ fontSize: 12, color: T.mid }}>
              Signed in as <span style={{ color: T.abyss, fontWeight: 500 }}>{firstName}</span>
            </span>
          )}
          <button
            onClick={handleSignOut}
            style={{
              background: "transparent",
              border: `1px solid ${T.offWhite}`,
              color: T.mid,
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
