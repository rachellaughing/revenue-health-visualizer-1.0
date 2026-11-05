import { supabase } from "@/integrations/supabase/client";
import { getViewerContext, type ViewerContext } from "@/lib/viewer.functions";

/**
 * Shared viewer-context fetch. Returns null (instead of throwing) when there is
 * no signed-in session, e.g. during sign-out or an expired session, so the
 * server function is never called without a bearer token.
 */
export async function fetchViewerContextSafe(): Promise<ViewerContext | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return null;
  try {
    return await getViewerContext();
  } catch (e) {
    if (e instanceof Error && /Unauthorized/i.test(e.message)) return null;
    throw e;
  }
}

/** Same guard for dashboard data: null when signed out instead of throwing. */
export async function fetchDashboardDataSafe() {
  const { getDashboardData } = await import("@/lib/dashboard.functions");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return null;
  try {
    return await getDashboardData();
  } catch (e) {
    if (e instanceof Error && /Unauthorized/i.test(e.message)) return null;
    throw e;
  }
}
