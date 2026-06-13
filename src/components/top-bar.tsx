import { Menu, ChevronDown, LogOut, Settings, CreditCard } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

type Props = {
  onToggleSidebar: () => void;
  firstName?: string | null;
  email?: string | null;
};

export function TopBar({ onToggleSidebar, firstName, email }: Props) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const displayName = firstName?.trim() || (email ? email.split("@")[0] : "Account");
  const initial = (displayName[0] || "U").toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-4"
      style={{
        height: 56,
        backgroundColor: "var(--mm-paper)",
        borderBottom: "1px solid var(--mm-off-white)",
      }}
    >
      <button
        onClick={onToggleSidebar}
        className="rounded p-2 transition-colors hover:bg-[var(--mm-off-white)]"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" style={{ color: "var(--mm-ink)" }} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-[var(--mm-off-white)]"
            aria-label="User menu"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: "var(--mm-abyss)" }}
            >
              {initial}
            </span>
            <span
              className="hidden text-sm font-medium sm:inline"
              style={{ color: "var(--mm-ink)" }}
            >
              {displayName}
            </span>
            <ChevronDown
              className="hidden h-4 w-4 sm:inline"
              style={{ color: "var(--mm-mid)" }}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-semibold" style={{ color: "var(--mm-ink)" }}>
                {displayName}
              </span>
              {email && (
                <span className="truncate text-xs font-normal" style={{ color: "var(--mm-mid)" }}>
                  {email}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/settings", search: { tab: "account" } })}
          >
            <Settings className="mr-2 h-4 w-4" />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/settings", search: { tab: "billing" } })}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Billing & Plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
