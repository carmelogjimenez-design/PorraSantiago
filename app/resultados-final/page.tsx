import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import ResultsBracket, { type RfMatch, type RfPred, type RfScorer } from "./results-bracket";
export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string; flag_url: string | null };
type MatchRow = {
  id: string; round: string | null; home_team_id: string | null; away_team_id: string | null;
  kickoff_at: string | null; status: string; home_score: number | null; away_score: number | null; api_fixture_id: number | null;
};
type PlayerRow = { id: string; full_name: string; team_id: string; goals: number | null; goals_override: number | null; goals_at_ko: number | null; ko_minute: string | null };
type PickRow = {
  user_id: string; display_name: string | null; slot: string;
  home_team_id: string | null; away_team_id: string | null; pred_home: number | null; pred_away: number | null;
};

const samePair = (a1: string | null, a2: string | null, b1: string | null, b2: string | null) =>
  (a1 === b1 && a2 === b2) || (a1 === b2 && a2 === b1);

export default async function ResultadosFinalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, ptsRes, teamsRes, matchesRes, picksRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("teams").select("id,name,flag_url"),
    supabase.from("matches")
      .select("id,round,home_team_id,away_team_id,kickoff_at,status,home_score,away_score,api_fixture_id")
      .not("round", "is", null)
      .order("api_fixture_id"),
    supabase.rpc("get_all_bracket_picks"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(ptsRes.data ?? 0);
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const matches = (matchesRes.data ?? []) as MatchRow[];

  // Goleadores de la ELIMINATORIA (goles actuales menos la foto al arrancar el KO).
  // Solo de los equipos que aparecen en el cuadro -> evita el límite de filas.
  const koTeamIds = Array.from(
    new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean))
  ) as string[];
  const scorersByTeam = new Map<string, RfScorer[]>();
  if (koTeamIds.length) {
    const { data: pl } = await supabase
      .from("players")
      .select("id,full_name,team_id,goals,goals_override,goals_at_ko,ko_minute")
      .in("team_id", koTeamIds);
    for (const p of (pl ?? []) as PlayerRow[]) {
      const cur = p.goals_override ?? p.goals ?? 0;
      const snap = p.goals_at_ko ?? cur; // sin foto -> diferencia 0
      const ko = Math.max(cur - snap, 0);
      if (ko > 0) {
        const arr = scorersByTeam.get(p.team_id) ?? [];
        arr.push({ name: p.full_name, goals: ko, minute: p.ko_minute ?? null });
        scorersByTeam.set(p.team_id, arr);
      }
    }
    for (const arr of scorersByTeam.values()) {
      arr.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    }
  }

  // Pronósticos de toda la peña (la RPC los revela cuando el cuadro está bloqueado)
  const picks = (picksRes.data ?? []) as PickRow[];

  const vms: RfMatch[] = matches.map((m, idx) => {
    const h = m.home_team_id ? teamById.get(m.home_team_id) : undefined;
    const a = m.away_team_id ? teamById.get(m.away_team_id) : undefined;

    const preds: RfPred[] = picks
      .filter((p) =>
        p.pred_home !== null &&
        p.pred_away !== null &&
        samePair(p.home_team_id, p.away_team_id, m.home_team_id, m.away_team_id)
      )
      .map((p) => {
        const aligned = p.home_team_id === m.home_team_id;
        return {
          userId: p.user_id,
          name: p.display_name ?? "Jugador",
          home: (aligned ? p.pred_home : p.pred_away) as number,
          away: (aligned ? p.pred_away : p.pred_home) as number,
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name));

    return {
      matchId: m.id,
      round: (m.round ?? "R32") as string,
      order: m.api_fixture_id ?? idx,
      homeName: h?.name ?? "?", homeFlag: h?.flag_url ?? null,
      awayName: a?.name ?? "?", awayFlag: a?.flag_url ?? null,
      homeScore: m.home_score, awayScore: m.away_score,
      status: m.status, kickoff: m.kickoff_at,
      scorersHome: m.home_team_id ? (scorersByTeam.get(m.home_team_id) ?? []) : [],
      scorersAway: m.away_team_id ? (scorersByTeam.get(m.away_team_id) ?? []) : [],
      preds,
    };
  });

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Resultados fase final 🏆</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        El cuadro con resultados reales, goleadores de cada partido y lo que puso cada uno. Toca un partido para ver los pronósticos de la peña.
      </p>

      {vms.length === 0 ? (
        <div className="card mt-6 p-6 text-center text-sm text-[var(--text-dim)]">
          Aún no hay partidos de eliminatoria cargados.
        </div>
      ) : (
        <ResultsBracket matches={vms} meId={user.id} />
      )}
    </AppShell>
  );
}
