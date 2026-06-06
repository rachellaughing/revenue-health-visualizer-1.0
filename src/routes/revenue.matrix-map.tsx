import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/revenue/matrix-map")({
  head: () => ({ meta: [{ title: "Matrix Map" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Matrix Map</h1>;
}
