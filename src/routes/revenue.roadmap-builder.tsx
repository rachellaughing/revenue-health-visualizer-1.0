import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/revenue/roadmap-builder")({
  head: () => ({ meta: [{ title: "Roadmap Builder" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Roadmap Builder</h1>;
}
