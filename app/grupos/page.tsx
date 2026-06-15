import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import GroupStage, { type MatchVM, type GroupVM } from "./group-stage";
export const dynamic = "force-dynamic";
type GroupRow = { id: number; label: string };
type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = {
  id: string; group_id: number | null; home_team_id: string; away_team_id: string;
  kickoff_at: string; stadium: string | null; status: string;
  home_score: number | null; away_score: number | null;
};
type PredRow = { match_id: string; pred_home: number; pred_away: number };
type PlayerMini = { id: string; full_name: string; team_id: string; goals: number | null; goals_override: number | null };
function computePoints(ph: number, pa: number, ah: number, aw: number): number {
  if (ph === ah && pa === aw) return 3;
  return Math.sign(ph - pa) === Math.sign(ah - aw) ? 1 : 0;
}
export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profileRes, myPtsRes, groupsRes, teamsRes, matchesRes, predsRes, ssRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("groups").select("id,label").order("id"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("matches").select("id,group_id,home_team_id,away_team_id,kickoff_at,stadium,status,home_score,away_score").order("kickoff_at"),
    supabase.from("predictions").select("match_id,pred_home,pred_away").eq("user_id", user.id),
    supabase.from("selected_scorers").select("player_id").eq("user_id", user.id),
  ]);
  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const preds = (predsRes.data ?? []) as PredRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const predByMatch = new Map<string, PredRow>(preds.map((p) => [p.match_id, p]));

  // --- Atribución (estimada) de goles de TUS goleadores por partido ---
  // La API solo da el total por jugador; lo repartimos entre los partidos jugados
  // de su equipo, en orden de fecha, sin pasar de los goles del equipo en cada partido.
  const chosenIds = ((ssRes.data ?? []) as { player_id: string }[]).map((r) => r.player_id);
  const hitsByMatch = new Map<string, { name: string; goals: number }[]>();
  if (chosenIds.length) {
    const { data: cpData } = await supabase
      .from("players")
      .select("id,full_name,team_id,goals,goals_override")
      .in("id", chosenIds);
    const chosen = ((cpData ?? []) as PlayerMini[]).map((p) => ({
      name: p.full_name,
      team_id: p.team_id,
      goals: p.goals_override ?? p.goals ?? 0,
    }));
    const finishedSorted = matches
      .filter((m) => m.status === "finished" && m.home_score != null && m.away_score != null)
      .sort((a, b) => (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? ""));
    for (const p of chosen) {
      let remaining = p.goals;
      if (remaining <= 0) continue;
      for (const m of finishedSorted) {
        if (remaining <= 0) break;
        const isHome = m.home_team_id === p.team_id;
        const isAway = m.away_team_id === p.team_id;
        if (!isHome && !isAway) continue;
        const teamGoals = (isHome ? m.home_score : m.away_score) ?? 0;
        if (teamGoals <= 0) continue;
        const assign = Math.min(remaining, teamGoals);
        if (assign > 0) {
          const arr = hitsByMatch.get(m.id) ?? [];
          arr.push({ name: p.name, goals: assign });
          hitsByMatch.set(m.id, arr);
          remaining -= assign;
        }
      }
    }
  }

  const matchVMs: MatchVM[] = matches.map((m) => {
    const home = teamById.get(m.home_team_id);
    const away = teamById.get(m.away_team_id);
    const pred = predByMatch.get(m.id) ?? null;
    let pointsM: number | null = null;
    if (m.status === "finished" && m.home_score != null && m.away_score != null && pred)
      pointsM = computePoints(pred.pred_home, pred.pred_away, m.home_score, m.away_score);
    const hits = hitsByMatch.get(m.id) ?? [];
    const scorerBonus = hits.reduce((s, h) => s + h.goals * 3, 0);
    return {
      id: m.id, groupId: m.group_id ?? 0, kickoffAt: m.kickoff_at, stadium: m.stadium,
      status: m.status, homeScore: m.home_score, awayScore: m.away_score,
      homeName: home?.name ?? "?", homeFlag: home?.flag_url ?? null,
      awayName: away?.name ?? "?", awayFlag: away?.flag_url ?? null,
      predHome: pred?.pred_home ?? null, predAway: pred?.pred_away ?? null, points: pointsM,
      scorerBonus, scorerHits: hits,
    };
  });
  const groupVMs: GroupVM[] = groups.map((g) => ({
    id: g.id, label: g.label, teams: teams.filter((t) => t.group_id === g.id).map((t) => t.name),
  }));
  return (
    <AppShell userName={name} points={points}>
      <GroupStage groups={groupVMs} matches={matchVMs} />
    </AppShell>
  );
}
