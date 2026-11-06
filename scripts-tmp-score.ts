// TEMPORARY one-off sandbox tool (demo seed 2026-11-06). Runs the app's real scoring on fixed ids. Remove after use.
import { _calculateAssessmentScoresImpl } from "@/lib/healthcheck.functions";
const jobs: [string, string][] = [
  ["c81bc992-f115-4bee-92e9-92477b026bd9", "507a7d2b-dce2-4ca5-bb1d-56f7b110bf0a"],
  ["52de1129-4490-4dd7-b86b-104a26cb06b7", "7639d17e-bf5d-49ec-b364-699c5215b535"],
  ["47d0f22f-9bd0-469e-9af3-0d6ef4f79b43", "df49ff0c-026e-40ce-979d-f9d90044d88a"],
  ["c1704c3d-dfd6-470a-9a4b-8596bbcae4fa", "cfb75f99-6650-4877-b025-37ebf14fe402"],
];
for (const [a, u] of jobs) {
  const r = await _calculateAssessmentScoresImpl(a, u);
  console.log("RESULT", a, JSON.stringify(r));
}
