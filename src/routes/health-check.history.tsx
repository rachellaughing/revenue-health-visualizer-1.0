import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health-check/history")({
  head: () => ({ meta: [{ title: "Health Check History" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Health Check History</h1>;
}
