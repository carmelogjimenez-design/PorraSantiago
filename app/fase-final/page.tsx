import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import KnockoutCountdown from "./countdown";
import KoMatchCard, { type KoMatchVM } from "./ko-match-card";
import FinalPrizes, { type ScorerOpt, type TeamOpt } from "./final-prizes";
import KoLeaderboard, { type KoLbRow } from "./ko-leaderboard";
export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = {
  id: string; round: string | null; home_team_id: string; away_team_id: string;
  kickoff_at: string; status: string; home_score: number | null; away_score: number | null;
};
type PlayerRow = { id: string; full_name: string; team_id: string; goals: number | null; goals_override: number | null };

export default async function FaseFinalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, teamsRes, matchesRes, koPicksRes, ssRes, fsRes, fpRes, lbRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("matches").select("id,round,home_team_id,away_team_id,kickoff_at,status,home_score,away_score").eq("round", "R32").order("kickoff_at"),
    supabase.from("knockout_picks").select("match_id,pred_home,pred_away").eq("user_id", user.id),
    supabase.from("selected_scorers").select("player_id,slot").eq("user_id", user.id).order("slot"),
    supabase.from("final_scorers").select("player_id").eq("user_id", user.id),
    supabase.from("final_picks").select("champion_id,runnerup_id").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("get_knockout_leaderboard"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));

  // Partidos R32 + mi pronóstico
  const koPicks = new Map<string, { pred_home: number; pred_away: number }>(
    ((koPicksRes.data ?? []) as Array<{ match_id: string; pred_home: number; pred_away: number }>).map((p) => [p.match_id, p])
  );
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const koMatches: KoMatchVM[] = matches.map((m) => {
    const h = teamById.get(m.home_team_id);
    const a = teamById.get(m.away_team_id);
    const pick = koPicks.get(m.id);
    return {
      id: m.id, kickoffAt: m.kickoff_at, status: m.status,
      homeName: h?.name ?? "?", homeFlag: h?.flag_url ?? null,
      awayName: a?.name ?? "?", awayFlag: a?.flag_url ?? null,
      homeScore: m.home_score, awayScore: m.away_score,
      predHome: pick?.pred_home ?? null, predAway: pick?.pred_away ?? null,
    };
  });

  // Mis 12 goleadores elegidos en grupos -> opciones para elegir 3
  const ssIds = ((ssRes.data ?? []) as Array<{ player_id: string }>).map((r) => r.player_id);
  let scorerOptions: ScorerOpt[] = [];
  if (ssIds.length) {
    const { data: pl } = await supabase
      .from("players").select("id,full_name,team_id,goals,goals_override").in("id", ssIds);
    scorerOptions = ((pl ?? []) as PlayerRow[]).map((p) => {
      const t = teamById.get(p.team_id);
      return { id: p.id, name: p.full_name, team: t?.name ?? "?", flag: t?.flag_url ?? null, goals: p.goals_override ?? p.goals ?? 0 };
    }).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
  }
  const initialScorers = ((fsRes.data ?? []) as Array<{ player_id: string }>).map((r) => r.player_id);

  // Equipos para campeón/subcampeón: los 32 que están en R32 (vivos)
  const aliveIds = new Set<string>();
  for (const m of matches) { aliveIds.add(m.home_team_id); aliveIds.add(m.away_team_id); }
  const teamOpts: TeamOpt[] = teams
    .filter((t) => aliveIds.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ id: t.id, name: t.name, flag: t.flag_url }));
  const initialChamp = fpRes.data?.champion_id ?? null;
  const initialRunner = fpRes.data?.runnerup_id ?? null;

  const lbRows = (lbRes.data ?? []) as KoLbRow[];

  // Countdown al primer partido R32
  const firstKo = matches.length ? matches[0].kickoff_at : null;
  const whenLabel = firstKo
    ? new Date(firstKo).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;
  const started = firstKo ? Date.now() >= new Date(firstKo).getTime() : false;

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Fase final 🏆</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">La eliminatoria a vida o muerte. Marcador nuevo desde 0.</p>

      {!started && (
        <div className="card mt-5 overflow-hidden p-0">
          <div className="bg-gradient-to-br from-white via-[#FFF4F7] to-[#FFE7EE] p-6 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">Arranca en</div>
            <KnockoutCountdown target={firstKo} whenLabel={whenLabel} />
            <p className="mx-auto mt-3 max-w-sm text-[13px] text-[var(--text-dim)]">
              Cuenta atrás al primer dieciseisavos. Ya puedes pronosticar y elegir goleadores, campeón y subcampeón.
            </p>
          </div>
        </div>
      )}

      {/* Premios: 3 goleadores + campeón/subcampeón */}
      <FinalPrizes
        scorerOptions={scorerOptions} initialScorers={initialScorers}
        teams={teamOpts} initialChamp={initialChamp} initialRunner={initialRunner} />

      {/* Los 16 dieciseisavos */}
      <section className="mt-8">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-lg">⚔️</span>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Dieciseisavos de final</h2>
          <span className="ml-auto rounded-full bg-[var(--soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-dim)]">{koMatches.length} partidos</span>
        </div>
        {koMatches.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[var(--text-dim)]">Aún no hay partidos cargados.</div>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {koMatches.map((m) => <KoMatchCard key={m.id} m={m} />)}
          </div>
        )}
      </section>

      {/* Clasificación fase final */}
      <KoLeaderboard rows={lbRows} meId={user.id} />
    </AppShell>
  );
}
