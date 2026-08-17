// Integration boundary for deep-linking into the Top Opportunities report.
//
// Top Opportunities is being rebuilt; its route contract (anchor scheme,
// query param, or per-system route) is not final. Every caller goes through
// this one function so the target can be updated in a single place.
//
// If no matching opportunity exists for a child system, callers must hide the
// link entirely — never fall back to the top of the report.

export const TOP_OPPORTUNITIES_ROUTE = "/reports/top-opportunities";

/**
 * Build the link to a specific opportunity by canonical child-system code.
 * TODO: update the fragment/param once the Top Opportunities rebuild lands.
 */
export function topOpportunityLink(code: string): string {
  return `${TOP_OPPORTUNITIES_ROUTE}#opportunity-${code.toLowerCase()}`;
}
