import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import KnockoutCountdown from "./countdown";
import BracketBuilder, { type BkR32VM, type BkInitial } from "./bracket-builder";
import FinalPrizes, { type ScorerOpt } from "./final-prizes";
import KoLeaderboard, { type KoLbRow } from "./ko-leaderboard";
export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = {
  id: string; round: string | null; home_team_id: string; away_team_id: string;
  kickoff_at: string; status: string; home_score: number | null; away_score: number | null; api_fixture_id: number | null;
};
type PlayerRow = { id: string; full_name: string; team_id: string; goals: number | null; goals_override: number | null };
type BracketRow = { slot: string; team_id: string | null; pred_home: number | null; pred_away: number | null };

export default async function FaseFinalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, teamsRes, matchesRes, bracketRes, ssRes, fsRes, lbRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("matches").select("id,round,home_team_id,away_team_id,kickoff_at,status,home_score,away_score,api_fixture_id").eq("round", "R32").order("api_fixture_id"),
    supabase.from("bracket_picks").select("slot,team_id,pred_home,pred_away").eq("user_id", user.id),
    supabase.from("selected_scorers").select("player_id,slot").eq("user_id", user.id).order("slot"),
    supabase.from("final_scorers").select("player_id").eq("user_id", user.id),
    supabase.rpc("get_knockout_leaderboard"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));

  // 16avos reales (ordenados de forma estable) -> entrada del cuadro
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const r32: BkR32VM[] = matches.map((m) => {
    const h = teamById.get(m.home_team_id);
    const a = teamById.get(m.away_team_id);
    return {
      matchId: m.id,
      home: { id: m.home_team_id, name: h?.name ?? "?", flag: h?.flag_url ?? null },
      away: { id: m.away_team_id, name: a?.name ?? "?", flag: a?.flag_url ?? null },
      kickoff: m.kickoff_at, status: m.status,
    };
  });

  // Mi cuadro guardado
  const initial: BkInitial = {};
  for (const r of (bracketRes.data ?? []) as BracketRow[]) {
    initial[r.slot] = { teamId: r.team_id, predHome: r.pred_home, predAway: r.pred_away };
  }

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

  const lbRows = (lbRes.data ?? []) as KoLbRow[];

  // Countdown al primer dieciseisavos (el más temprano) + candado del cuadro
  const firstKo = matches.length ? [...matches].map((m) => m.kickoff_at).sort()[0] : null;
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
              Cuenta atrás al primer dieciseisavos. Rellena tu cuadro entero y elige tus 3 goleadores antes de que arranque.
            </p>
          </div>
        </div>
      )}

      {/* 3 goleadores */}
      <FinalPrizes scorerOptions={scorerOptions} initialScorers={initialScorers} />

      {/* El cuadro completo (sustituye a los dieciseisavos sueltos) */}
      {r32.length === 0 ? (
        <div className="card mt-8 p-6 text-center text-sm text-[var(--text-dim)]">Aún no hay partidos cargados.</div>
      ) : (
        <BracketBuilder r32={r32} initial={initial} locked={started} />
      )}

      {/* Clasificación fase final */}
      <KoLeaderboard rows={lbRows} meId={user.id} />
    </AppShell>
  );
}
