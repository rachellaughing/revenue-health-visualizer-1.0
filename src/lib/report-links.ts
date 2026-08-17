// Integration boundary for deep-linking into the Top Opportunities report.
//
// Top Opportunities is being rebuilt; its route contract (anchor scheme,
// query param, or per-system route) is not final. Every caller goes through
// this one function so the target can be updated in a single place.
//
// If no matching opportunity exists for a child system, callers must hide the
// link entirely — never fall back to the top of the report.

export const TOP_OPPORTUNITIES_ROUTE = "/reports/top-opportunities";
export const MATRIX_MAP_ROUTE = "/revenue/matrix-map";

/**
 * Build the link to a specific opportunity by canonical child-system code.
 * TODO: update the fragment/param once the Top Opportunities rebuild lands.
 */
export function topOpportunityLink(code: string): string {
  return `${TOP_OPPORTUNITIES_ROUTE}#opportunity-${code.toLowerCase()}`;
}

/**
 * Resolve a deep link to a single opportunity by child_system_id (uuid).
 *
 * The rebuilt Top Opportunities page does not yet render stable per-system
 * anchors, so there is no target to link to. Returns null until it does —
 * callers MUST hide the link when this returns null rather than falling back
 * to the top of the report.
 */
export function resolveTopOpportunityLink(_childSystemId: string): string | null {
  return null;
}

/**
 * Matrix Map deep link. The live route has no URL-parameter support for
 * pre-selecting a child system, so this intentionally ignores the id and
 * navigates to the page itself.
 */
export function matrixMapLink(_childSystemId: string): string {
  return MATRIX_MAP_ROUTE;
}

