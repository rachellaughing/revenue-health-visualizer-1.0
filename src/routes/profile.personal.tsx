import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile/personal")({
  head: () => ({ meta: [{ title: "Personal Profile" }] }),
  component: Page,
});

function Page() {
  return (
    <h1 className="text-4xl" style={{ fontFamily: "'Instrument Serif', serif", color: "var(--mm-ink)" }}>
      Personal Profile
    </h1>
  );
}
