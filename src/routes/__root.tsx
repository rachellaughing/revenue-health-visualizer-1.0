import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "../components/app-sidebar";
import { TopBar } from "../components/top-bar";
import { BottomTabBar } from "../components/bottom-tab-bar";
import { TeamMemberShell } from "../components/team-member-shell";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { Toaster } from "../components/ui/sonner";
import { useIsMobile } from "../hooks/use-mobile";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getViewerContext } from "../lib/viewer.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Revenue Health Visualiser" },
      { name: "description", content: "Revenue Health Visualiser" },
      { property: "og:title", content: "Revenue Health Visualiser" },
      { name: "twitter:title", content: "Revenue Health Visualiser" },
      { property: "og:description", content: "Revenue Health Visualiser" },
      { name: "twitter:description", content: "Revenue Health Visualiser" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f1bf15e4-a80a-4851-9637-c183de555c80/id-preview-cab0aac2--c72c9175-77ec-4bd7-94d8-0f3f3996d5b4.lovable.app-1780887653943.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f1bf15e4-a80a-4851-9637-c183de555c80/id-preview-cab0aac2--c72c9175-77ec-4bd7-94d8-0f3f3996d5b4.lovable.app-1780887653943.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const PUBLIC_ROUTES = ["/login", "/signup"];

function AuthGate() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { session, loading, user } = useAuth();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const fetchViewer = useServerFn(getViewerContext);
  const viewerQ = useQuery({
    queryKey: ["viewer-context"],
    queryFn: () => fetchViewer(),
    enabled: !!session && !isPublic,
  });

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) navigate({ to: "/login", replace: true });
  }, [loading, session, isPublic, navigate]);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  if (isPublic) return <Outlet />;

  if (loading || !session || viewerQ.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: "var(--mm-paper)" }}>
        <p className="text-sm" style={{ color: "var(--mm-mid)" }}>Loading…</p>
      </div>
    );
  }

  if (viewerQ.data?.role === "team_member") {
    return (
      <>
        <TeamMemberShell firstName={viewerQ.data.firstName} />
        <Toaster />
      </>
    );
  }

  const handleToggle = () => {
    if (isMobile) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: "var(--mm-paper)" }}>
      {/* Desktop: inline sidebar */}
      {!isMobile && <AppSidebar collapsed={collapsed} />}

      {/* Mobile: drawer overlay */}
      {isMobile && (
        <>
          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 50,
              }}
              aria-hidden
            />
          )}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              zIndex: 60,
              transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 220ms ease",
              boxShadow: mobileOpen ? "0 0 30px rgba(0,0,0,0.3)" : "none",
            }}
          >
            <AppSidebar collapsed={false} />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onToggleSidebar={handleToggle}
          firstName={viewerQ.data?.firstName ?? null}
          email={user?.email ?? null}
        />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-8"
          style={
            isMobile
              ? { paddingBottom: "calc(56px + env(safe-area-inset-bottom) + 16px)" }
              : undefined
          }
        >
          <Outlet />
        </main>
      </div>

      {isMobile && <BottomTabBar />}
      <Toaster />
    </div>
  );
}
