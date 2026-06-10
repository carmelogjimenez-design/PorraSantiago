import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import ScorersPicker, { type PlayerVM } from "./scorers-picker";
export const dynamic = "force-dynamic";
type PlayerRow = { id: string; full_name: string; position: string | null; team_id: string; goals: number | null; goals_override: number | null };
type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type SSRow = { player_id: string; slot: number };
const POS = ["#f5b301", "#9aa3af", "#cd7f32"]; // oro, plata, bronce
export default async function GoleadoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profileRes, myPtsRes, players1Res, players2Res, teamsRes, ssRes, cfgRes, firstRes, groupsRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("players").select("id,full_name,position,team_id,goals,goals_override").order("full_name").range(0, 999),
    supabase.from("players").select("id,full_name,position,team_id,goals,goals_override").order("full_name").range(1000, 1999),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("selected_scorers").select("player_id,slot").eq("user_id", user.id).order("slot"),
    supabase.from("tournament_config").select("group_stage_starts_at").eq("id", 1).maybeSingle(),
    supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
    supabase.from("groups").select("id,label").order("id"),
  ]);
  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const groups = (groupsRes.data ?? []) as { id: number; label: string }[];
  const playersRaw = ([...(players1Res.data ?? []), ...(players2Res.data ?? [])]) as PlayerRow[];
  const players: PlayerVM[] = playersRaw
    .map((p) => {
      const t = teamById.get(p.team_id);
      return { id: p.id, name: p.full_name, pos: p.position ?? "", team: t?.name ?? "?", flag: t?.flag_url ?? null, groupId: t?.group_id ?? 0 };
    })
    .filter((p) => p.groupId >= 1 && p.groupId <= 12)
    .sort((a, b) => (a.team === b.team ? a.name.localeCompare(b.name) : a.team.localeCompare(b.team)));

  // Elecciones actuales del usuario: slot (= nº de grupo 1..12) -> jugador
  const ssRows = ((ssRes.data ?? []) as SSRow[]);
  const initialByGroup: Record<number, string> = {};
  for (const r of ssRows) if (r.slot >= 1 && r.slot <= 12) initialByGroup[r.slot] = r.player_id;

  const startStr = cfgRes.data?.group_stage_starts_at ?? firstRes.data?.kickoff_at ?? null;
  const locked = startStr ? Date.now() >= new Date(startStr).getTime() : false;

  // Máximos goleadores reales del Mundial (se llena con el sync)
  const topScorers = playersRaw
    .map((p) => {
      const t = teamById.get(p.team_id);
      return { id: p.id, name: p.full_name, team: t?.name ?? "", flag: t?.flag_url ?? null, goals: p.goals_override ?? p.goals ?? 0 };
    })
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, 10);
  return (
    <AppShell userName={name} points={points}>
      {players.length === 0 ? (
        <>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Goleadores</h1>
          <div className="card mt-5 p-8 text-center">
            <div className="text-4xl">⚽</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-dim)]">
              Estamos preparando la lista de jugadores. Vuelve a entrar en un momentito y podrás elegir a tus goleadores. Si sigue así, avisa a Santiago. 😉
            </p>
          </div>
        </>
      ) : (
        <>
          <ScorersPicker players={players} groups={groups} initialByGroup={initialByGroup} locked={locked} />

          <section className="mt-8">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Máximos goleadores del Mundial</h2>
            </div>
            {topScorers.length === 0 ? (
              <div className="card p-6 text-center">
                <div className="text-3xl">⚽</div>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-dim)]">
                  Aún no ha marcado nadie. Esto se llena en cuanto ruede el balón (11 jun).
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                {topScorers.map((s, i) => (
                  <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                    <span
                      className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-extrabold ${i < 3 ? "text-white" : "bg-[var(--soft)] text-[var(--text-dim)]"}`}
                      style={i < 3 ? { background: POS[i] } : undefined}>
                      {i + 1}
                    </span>
                    {s.flag && <img src={s.flag} alt="" className="h-4 w-6 flex-none rounded-sm object-cover" />}
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-sm font-bold">{s.name}</span>
                      {s.team && <span className="ml-1.5 text-[11px] text-[var(--text-dim)]">{s.team}</span>}
                    </span>
                    <span className="flex-none font-[family-name:var(--font-display)] text-sm font-extrabold">
                      {s.goals}<span className="ml-0.5 text-[10px] font-bold text-[var(--text-dim)]">{s.goals === 1 ? "gol" : "goles"}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
