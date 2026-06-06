import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports/founder-dependency")({
  head: () => ({ meta: [{ title: "Founder Dependency" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Founder Dependency</h1>;
}
