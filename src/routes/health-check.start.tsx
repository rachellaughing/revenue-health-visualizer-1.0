import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health-check/start")({
  head: () => ({ meta: [{ title: "Start / Resume Health Check" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Start / Resume Health Check</h1>;
}
