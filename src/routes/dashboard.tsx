import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard" }] }),
  component: Page,
});

function Page() {
  return (
    <h1 className="text-4xl" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}>
      Dashboard
    </h1>
  );
}
