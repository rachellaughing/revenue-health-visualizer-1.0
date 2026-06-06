import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports/executive-summary")({
  head: () => ({ meta: [{ title: "Executive Summary" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Executive Summary</h1>;
}
