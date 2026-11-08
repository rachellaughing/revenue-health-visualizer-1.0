import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type HistoryEntry = {
  id: string;
  quarter: string;
  completedAt: string;
  overall: number | null;
  systems: { code: string; name: string; score: number | null }[];
};

function quarterLabel(d: Date) {
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

export const getHealthCheckHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HistoryEntry[]> => {
    const userId = context.userId;
    const { data: asmts, error } = await supabaseAdmin
      .from("assessments")
      .select("id,status,overall_health_score,submitted_at,completed_at")
      .eq("user_id", userId)
      .in("status", ["completed", "complete"])
      .is("parent_assessment_id", null);
    if (error) throw new Error(error.message);
    const list = (asmts ?? [])
      .map((a: any) => ({ ...a, when: a.submitted_at ?? a.completed_at }))
      .filter((a) => a.when)
      .sort((a, b) => String(b.when).localeCompare(String(a.when)));
    if (!list.length) return [];

    const [scoresRes, parentsRes, childrenRes] = await Promise.all([
      supabaseAdmin
        .from("assessment_scores")
        .select("assessment_id,child_system_id,health_score")
        .eq("user_id", userId)
        .in("assessment_id", list.map((a) => a.id)),
      (supabaseAdmin as any).schema("revhealth2").from("parent_systems").select("id,code,name,sort_order").order("sort_order"),
      (supabaseAdmin as any).schema("revhealth2").from("child_systems").select("id,parent_system_id"),
    ]);
    const parents: { id: string; code: string; name: string }[] = parentsRes.data ?? [];
    const childParent = new Map<string, string>(
      (childrenRes.data ?? []).map((c: any) => [c.id, c.parent_system_id]),
    );

    return list.map((a) => {
      const sums = new Map<string, { t: number; n: number }>();
      for (const s of scoresRes.data ?? []) {
        if (s.assessment_id !== a.id || s.health_score == null) continue;
        const p = childParent.get(s.child_system_id);
        if (!p) continue;
        const cur = sums.get(p) ?? { t: 0, n: 0 };
        cur.t += Number(s.health_score);
        cur.n += 1;
        sums.set(p, cur);
      }
      const systems = parents.map((p) => {
        const v = sums.get(p.id);
        return { code: p.code, name: p.name, score: v ? Math.round(v.t / v.n) : null };
      });
      const valid = systems.filter((s) => s.score != null) as { score: number }[];
      const overall =
        a.overall_health_score != null
          ? Math.round(Number(a.overall_health_score))
          : valid.length
            ? Math.round(valid.reduce((x, y) => x + y.score, 0) / valid.length)
            : null;
      return {
        id: a.id,
        quarter: quarterLabel(new Date(a.when)),
        completedAt: a.when,
        overall,
        systems,
      };
    });
  });
