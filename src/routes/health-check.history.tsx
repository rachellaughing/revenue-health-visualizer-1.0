import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getHealthCheckHistory, type HistoryEntry } from "@/lib/history.functions";
import { getSystemClass } from "@/lib/system-colors";
import { Bar, Card, PageShell, ScoreRing, SectionLabel, Skeleton } from "@/components/ui-mm";

export const Route = createFileRoute("/health-check/history")({
  head: () => ({
    meta: [
      { title: "Health Check History | Revenue Health Visualiser™" },
      { name: "description", content: "Compare your quarterly Health Check results over time." },
      { property: "og:title", content: "Health Check History" },
      { property: "og:description", content: "Compare your quarterly Health Check results over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

async function fetchHistory(): Promise<HistoryEntry[]> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return [];
  return getHealthCheckHistory();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function Delta({ now, prev }: { now: number | null; prev: number | null | undefined }) {
  if (now == null || prev == null) return null;
  const d = now - prev;
  const cls = d > 0 ? "text-[var(--mm-status-success)]" : d < 0 ? "text-[var(--mm-status-error)]" : "mm-muted";
  return <span className={`text-xs font-semibold ${cls}`}>{d > 0 ? "▲" : d < 0 ? "▼" : "•"} {d > 0 ? `+${d}` : d}</span>;
}

function Page() {
  const { data, isLoading, error } = useQuery({ queryKey: ["hc-history"], queryFn: fetchHistory });

  return (
    <PageShell narrow>
      <SectionLabel>Health Check</SectionLabel>
      <h1 className="mm-heading-xl mb-2 text-[var(--mm-text)]">Health Check History</h1>
      <p className="mm-body mm-muted mb-8">Your quarterly Health Checks, newest first, with change since the previous quarter.</p>

      {isLoading && <div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>}
      {error && <Card><p className="mm-body">Couldn't load your history. Please refresh the page.</p></Card>}

      {data && data.length < 2 && (
        <Card>
          <p className="mm-body text-[var(--mm-text)]">Complete your next quarterly Health Check to unlock quarter-over-quarter comparison.</p>
          <Link to="/health-check" className="mm-btn-ember mt-4 inline-flex">Go to Health Check</Link>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="flex flex-col gap-5">
          {data.map((h, i) => {
            const prev = data[i + 1];
            return (
              <Card key={h.id} className="p-6">
                <div className="mb-5 flex flex-wrap items-center gap-5">
                  <ScoreRing pct={h.overall ?? 0} size={72} color="var(--mm-ember)" />
                  <div className="flex-1">
                    <div className="mm-heading-md text-[var(--mm-text)]">{h.quarter} Health Check</div>
                    <div className="mm-body mm-muted">Completed {fmtDate(h.completedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="mm-body mm-muted">Overall</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold text-[var(--mm-text)]">{h.overall ?? "—"}</span>
                      <Delta now={h.overall} prev={prev?.overall} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {h.systems.map((s) => {
                    const p = prev?.systems.find((x) => x.code === s.code)?.score;
                    return (
                      <div key={s.code} className={`grid grid-cols-[140px_1fr_80px] items-center gap-3 ${getSystemClass(s.code)}`}>
                        <span className="text-sm text-[var(--mm-text)]">{s.name}</span>
                        <Bar pct={s.score ?? 0} label={`${s.name} score`} />
                        <span className="flex items-center justify-end gap-2 text-sm">
                          <span className="font-semibold text-[var(--mm-text)]">{s.score ?? "—"}</span>
                          <Delta now={s.score} prev={p} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
