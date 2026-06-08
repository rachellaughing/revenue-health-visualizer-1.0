import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/billing")({
  validateSearch: (s: Record<string, unknown>) => ({
    success: s.success === "true" || s.success === true ? true : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/settings",
      search: { tab: "billing", ...(search.success ? { success: true } : {}) },
    });
  },
});
