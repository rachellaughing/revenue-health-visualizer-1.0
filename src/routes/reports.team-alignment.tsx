import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports/team-alignment")({
  head: () => ({ meta: [{ title: "Team Alignment" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Team Alignment</h1>;
}
