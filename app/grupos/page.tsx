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

function computePoints(ph: number, pa: number, ah: number, aw: number): number {
  if (ph === ah && pa === aw) return 3;
  return Math.sign(ph - pa) === Math.sign(ah - aw) ? 1 : 0;
}

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, groupsRes, teamsRes, matchesRes, predsRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("groups").select("id,label").order("id"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("matches").select("id,group_id,home_team_id,away_team_id,kickoff_at,stadium,status,home_score,away_score").order("kickoff_at"),
    supabase.from("predictions").select("match_id,pred_home,pred_away").eq("user_id", user.id),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const preds = (predsRes.data ?? []) as PredRow[];

  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const predByMatch = new Map<string, PredRow>(preds.map((p) => [p.match_id, p]));

  const matchVMs: MatchVM[] = matches.map((m) => {
    const home = teamById.get(m.home_team_id);
    const away = teamById.get(m.away_team_id);
    const pred = predByMatch.get(m.id) ?? null;
    let pointsM: number | null = null;
    if (m.status === "finished" && m.home_score != null && m.away_score != null && pred)
      pointsM = computePoints(pred.pred_home, pred.pred_away, m.home_score, m.away_score);
    return {
      id: m.id, groupId: m.group_id ?? 0, kickoffAt: m.kickoff_at, stadium: m.stadium,
      status: m.status, homeScore: m.home_score, awayScore: m.away_score,
      homeName: home?.name ?? "?", homeFlag: home?.flag_url ?? null,
      awayName: away?.name ?? "?", awayFlag: away?.flag_url ?? null,
      predHome: pred?.pred_home ?? null, predAway: pred?.pred_away ?? null, points: pointsM,
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
