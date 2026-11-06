import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import rhIconDark from "@/assets/rh-icon-dark.svg.asset.json";

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
    <div className="mm-tm-shell">
      <header className="mm-tm-header">
        <Link to="/dashboard" className="mm-tm-logo" aria-label="Revenue Health Visualizer">
          <img src={rhIconDark.url} alt="Revenue Health Visualizer" />
        </Link>

        <nav className="mm-tm-nav">
          <Link to="/health-check" activeProps={{ className: "mm-active" }}>
            Health Check
          </Link>
        </nav>

        <div className="mm-tm-user">
          {firstName && (
            <span className="mm-tm-user__label">
              Signed in as <strong>{firstName}</strong>
            </span>
          )}
          <button type="button" onClick={handleSignOut} className="mm-btn-quiet">
            Sign out
          </button>
        </div>
      </header>

      <main className="mm-tm-main">
        <Outlet />
      </main>
    </div>
  );
}
