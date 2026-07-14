// Shared tier-preview redirect guard.
//
// Used by every report route that has a real (Diagnostic-only) view and a
// separate illustrative "-preview" route for Starter/Pro. Do not build a
// one-off tier check per page — import this hook instead.
//
// Behaviour: fetches the user's tier via the existing getCurrentTier()
// server function (already used by Settings > Team). If the tier is not
// "diagnostic", it redirects (replace, no history entry) to previewTo before
// the real page's own data query ever fires — so Starter/Pro users never
// even request the real report payload.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCurrentTier } from "@/lib/stripe-checkout.functions";

export type GateStatus = {
  /** True once we've confirmed the user is Diagnostic tier and it's safe to render/fetch the real report. */
  ready: boolean;
  /** True while we're still checking tier (show a lightweight loading state, not the real report). */
  checking: boolean;
  tier: string | null;
};

export function useDiagnosticTierGate(previewTo: string): GateStatus {
  const navigate = useNavigate();
  const fetchTier = useServerFn(getCurrentTier);
  const { data, isLoading } = useQuery({
    queryKey: ["current-tier"],
    queryFn: () => fetchTier(),
    staleTime: 60_000,
  });

  const tier = data?.tier ?? null;
  const isDiagnostic = tier === "diagnostic";

  useEffect(() => {
    if (!isLoading && tier && !isDiagnostic) {
      navigate({ to: previewTo, replace: true });
    }
  }, [isLoading, tier, isDiagnostic, previewTo, navigate]);

  return {
    ready: !isLoading && isDiagnostic,
    checking: isLoading || (!!tier && !isDiagnostic),
    tier,
  };
}
