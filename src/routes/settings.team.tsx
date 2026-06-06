import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/team")({
  head: () => ({ meta: [{ title: "Team" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Team</h1>;
}
