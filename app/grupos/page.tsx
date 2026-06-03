import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "./match-card";

export const dynamic = "force-dynamic";

type GroupRow = { id: number; label: string; name: string | null };
type TeamRow = {
  id: string;
  name: string;
  flag_url: string | null;
  group_id: number | null;
};
type MatchRow = {
  id: string;
  group_id: number | null;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string;
  stadium: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
};
type PredRow = { match_id: string; pred_home: number; pred_away: number };

function computePoints(
  ph: number,
  pa: number,
  ah: number,
  aw: number
): number {
  if (ph === ah && pa === aw) return 3;
  const pred = Math.sign(ph - pa);
  const real = Math.sign(ah - aw);
  return pred === real ? 1 : 0;
}

export default async function GruposPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [groupsRes, teamsRes, matchesRes, predsRes] = await Promise.all([
    supabase.from("groups").select("id,label,name").order("id"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase
      .from("matches")
      .select(
        "id,group_id,home_team_id,away_team_id,kickoff_at,stadium,status,home_score,away_score"
      )
      .order("kickoff_at"),
    supabase
      .from("predictions")
      .select("match_id,pred_home,pred_away")
      .eq("user_id", user.id),
  ]);

  const groups = (groupsRes.data ?? []) as GroupRow[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const preds = (predsRes.data ?? []) as PredRow[];

  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const predByMatch = new Map<string, PredRow>(
    preds.map((p) => [p.match_id, p])
  );
  const matchesByGroup = new Map<number, MatchRow[]>();
  for (const m of matches) {
    if (m.group_id == null) continue;
    const arr = matchesByGroup.get(m.group_id) ?? [];
    arr.push(m);
    matchesByGroup.set(m.group_id, arr);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-[var(--text-dim)] hover:text-[var(--accent)]"
          >
            ← Inicio
          </Link>
          <h1 className="mt-1 font-[var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            Fase de grupos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Pon tu resultado exacto. 3 pts si lo clavas · 1 pt si aciertas el
            ganador.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {groups.map((g) => {
          const gMatches = matchesByGroup.get(g.id) ?? [];
          const gTeams = teams.filter((t) => t.group_id === g.id);
          return (
            <section key={g.id}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-extrabold text-white">
                  {g.label}
                </span>
                <h2 className="text-lg font-bold">Grupo {g.label}</h2>
                <span className="text-xs text-[var(--text-dim)]">
                  {gTeams.map((t) => t.name).join(" · ")}
                </span>
              </div>

              {gMatches.length === 0 ? (
                <p className="text-sm text-[var(--text-dim)]">
                  Partidos aún no disponibles.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {gMatches.map((m) => {
                    const home = teamById.get(m.home_team_id);
                    const away = teamById.get(m.away_team_id);
                    const pred = predByMatch.get(m.id) ?? null;
                    let points: number | null = null;
                    if (
                      m.status === "finished" &&
                      m.home_score != null &&
                      m.away_score != null &&
                      pred
                    ) {
                      points = computePoints(
                        pred.pred_home,
                        pred.pred_away,
                        m.home_score,
                        m.away_score
                      );
                    }
                    return (
                      <MatchCard
                        key={m.id}
                        matchId={m.id}
                        kickoffAt={m.kickoff_at}
                        stadium={m.stadium}
                        status={m.status}
                        homeScore={m.home_score}
                        awayScore={m.away_score}
                        homeName={home?.name ?? "?"}
                        homeFlag={home?.flag_url ?? null}
                        awayName={away?.name ?? "?"}
                        awayFlag={away?.flag_url ?? null}
                        predHome={pred?.pred_home ?? null}
                        predAway={pred?.pred_away ?? null}
                        points={points}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
