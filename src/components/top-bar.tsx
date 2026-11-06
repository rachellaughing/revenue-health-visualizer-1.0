import { Menu, ChevronDown, LogOut, Settings, CreditCard, Sun, Moon } from "lucide-react";
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
import { useTheme } from "@/lib/theme";

type Props = {
  onToggleSidebar: () => void;
  firstName?: string | null;
  email?: string | null;
};

export function TopBar({ onToggleSidebar, firstName, email }: Props) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const displayName = firstName?.trim() || (email ? email.split("@")[0] : "Account");
  const initial = (displayName[0] || "U").toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header
      className="mm-appbar"
    >
      <button
        onClick={onToggleSidebar}
        className="rounded p-2 transition-colors hover:bg-[var(--mm-off-white)]"
        aria-label="Toggle sidebar"
      >
        <Menu className="mm-ink h-5 w-5" />
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="rounded p-2 transition-colors hover:bg-[var(--mm-off-white)]"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Moon className="mm-ink h-5 w-5" />
          ) : (
            <Sun className="mm-ink h-5 w-5" />
          )}
        </button>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-[var(--mm-off-white)]"
            aria-label="User menu"
          >
            <span className="mm-avatar">
              {initial}
            </span>
            <span
              className="mm-ink hidden text-sm font-medium sm:inline"
            >
              {displayName}
            </span>
            <ChevronDown
              className="mm-muted hidden h-4 w-4 sm:inline"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="mm-ink text-sm font-semibold">
                {displayName}
              </span>
              {email && (
                <span className="mm-muted truncate text-xs font-normal">
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
      </div>
    </header>
  );
}
