import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports/revenue-at-risk")({
  head: () => ({ meta: [{ title: "Revenue at Risk" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Revenue at Risk</h1>;
}
