import { Menu } from "lucide-react";

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
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
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: "var(--mm-abyss)" }}
      >
        U
      </div>
    </header>
  );
}
