import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/personal-profile")({
  head: () => ({ meta: [{ title: "Personal Profile" }] }),
  component: Page,
});

function Page() {
  return <h1 className="text-4xl" style={{ color: "var(--mm-ink)" }}>Personal Profile</h1>;
}
