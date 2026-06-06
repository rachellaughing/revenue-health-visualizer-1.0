import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/company-profile")({
  head: () => ({ meta: [{ title: "Company Profile" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Company Profile</h1>;
}
