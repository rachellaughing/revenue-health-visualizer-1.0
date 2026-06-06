import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/revenue/shadow-systems")({
  head: () => ({ meta: [{ title: "Shadow Systems" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Shadow Systems</h1>;
}
