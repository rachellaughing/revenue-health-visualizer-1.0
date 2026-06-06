import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/account")({
  head: () => ({ meta: [{ title: "Account" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Account</h1>;
}
