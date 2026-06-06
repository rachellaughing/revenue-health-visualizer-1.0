import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/billing")({
  head: () => ({ meta: [{ title: "Billing & Plan" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Billing & Plan</h1>;
}
