import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import { type MatchVM, type PredVM } from "./board";
import PronosticosTabs from "./pronosticos-tabs";
import { type BracketPlayer, type BkPickVM, type TeamLite } from "./bracket-view";
export const dynamic = "force-dynamic";
type GroupRow = { id: number; label: string };
type TeamRow = { id: string; name: string; flag_url: string | null };
type MatchRow = {
  id: string; group_id: number | null; round: string | null; home_team_id: string; away_team_id: string;
  kickoff_at: string; status: string; home_score: number | null; away_score: number | null;
};
type PredRow = { user_id: string; display_name: string; match_id: string; pred_home: number; pred_away: number };
type BkRow = {
  user_id: string; display_name: string; slot: string; team_id: string | null;
  team_name: string | null; team_flag: string | null; pred_home: number | null; pred_away: number | null;
  home_team_id: string | null; away_team_id: string | null;
};
// Nombre bonito de cada ronda de la fase final
function roundLabel(round: string | null): string {
  switch (round) {
    case "R32": return "Dieciseisavos";
    case "R16": return "Octavos";
    case "QF": return "Cuartos";
    case "SF": return "Semifinal";
    case "FIN": return "Final";
    default: return round ?? "";
  }
}
export default async function PronosticosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profileRes, myPtsRes, groupsRes, teamsRes, matchesRes, predsRes, bracketRes] = await Promise.all([
    supabase.from("profiles").select("display_name,role").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("groups").select("id,label").order("id"),
    supabase.from("teams").select("id,name,flag_url"),
    supabase.from("matches").select("id,group_id,round,home_team_id,away_team_id,kickoff_at,status,home_score,away_score").order("kickoff_at"),
    supabase.rpc("get_all_predictions"),
    supabase.rpc("get_all_bracket_picks"),
  ]);
  const name = profileRes.data?.display_name ?? "Jugador";
  const isAdmin = profileRes.data?.role === "admin";
  const points = Number(myPtsRes.data ?? 0);
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const matchesRaw = (matchesRes.data ?? []) as MatchRow[];
  const preds = (predsRes.data ?? []) as PredRow[];
  const bracket = (bracketRes.data ?? []) as BkRow[];
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const labelById = new Map(groups.map((g) => [g.id, g.label]));
  const matches: MatchVM[] = matchesRaw.map((m) => {
    const h = teamById.get(m.home_team_id);
    const a = teamById.get(m.away_team_id);
    return {
      id: m.id,
      group: m.group_id != null ? (labelById.get(m.group_id) ?? "") : roundLabel(m.round),
      kickoffAt: m.kickoff_at,
      status: m.status,
      homeScore: m.home_score,
      awayScore: m.away_score,
      homeName: h?.name ?? "?", homeFlag: h?.flag_url ?? null,
      awayName: a?.name ?? "?", awayFlag: a?.flag_url ?? null,
    };
  });
  const predsByMatch: Record<string, PredVM[]> = {};
  for (const p of preds) {
    (predsByMatch[p.match_id] ??= []).push({ name: p.display_name, ph: p.pred_home, pa: p.pred_away });
  }
  for (const k of Object.keys(predsByMatch)) {
    predsByMatch[k].sort((a, b) => a.name.localeCompare(b.name));
  }
  const matchesUnlocked = preds.length > 0;

  // CUADROS de la peña
  const teamLiteById: Record<string, TeamLite> = {};
  for (const t of teams) teamLiteById[t.id] = { name: t.name, flag: t.flag_url };
  const byUser = new Map<string, BracketPlayer>();
  for (const r of bracket) {
    let pl = byUser.get(r.user_id);
    if (!pl) { pl = { userId: r.user_id, displayName: r.display_name, picks: {} }; byUser.set(r.user_id, pl); }
    const pick: BkPickVM = {
      slot: r.slot, teamId: r.team_id, teamName: r.team_name, teamFlag: r.team_flag,
      predHome: r.pred_home, predAway: r.pred_away, homeTeamId: r.home_team_id, awayTeamId: r.away_team_id,
    };
    pl.picks[r.slot] = pick;
  }
  const players: BracketPlayer[] = [...byUser.values()];
  const bracketUnlocked = players.length > 0;

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Pronósticos 👀</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        El cuadro de la peña: lo que ha puesto cada uno. Elige <b>Cuadros</b> para ver el bracket completo de cada jugador.
      </p>
      <PronosticosTabs
        matches={matches}
        predsByMatch={predsByMatch}
        isAdmin={isAdmin}
        matchesUnlocked={matchesUnlocked}
        players={players}
        teamById={teamLiteById}
        bracketUnlocked={bracketUnlocked}
      />
    </AppShell>
  );
}
