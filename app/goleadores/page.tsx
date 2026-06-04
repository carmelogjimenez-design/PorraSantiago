import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import ScorersPicker, { type PlayerVM } from "./scorers-picker";

export const dynamic = "force-dynamic";

type PlayerRow = { id: string; full_name: string; position: string | null; team_id: string };
type TeamRow = { id: string; name: string; flag_url: string | null };
type SSRow = { player_id: string; slot: number };

export default async function GoleadoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, players1Res, players2Res, teamsRes, ssRes, cfgRes, firstRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("players").select("id,full_name,position,team_id").order("full_name").range(0, 999),
    supabase.from("players").select("id,full_name,position,team_id").order("full_name").range(1000, 1999),
    supabase.from("teams").select("id,name,flag_url"),
    supabase.from("selected_scorers").select("player_id,slot").eq("user_id", user.id).order("slot"),
    supabase.from("tournament_config").select("group_stage_starts_at").eq("id", 1).maybeSingle(),
    supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const playersRaw = ([...(players1Res.data ?? []), ...(players2Res.data ?? [])]) as PlayerRow[];

  const players: PlayerVM[] = playersRaw
    .map((p) => {
      const t = teamById.get(p.team_id);
      return { id: p.id, name: p.full_name, pos: p.position ?? "", team: t?.name ?? "?", flag: t?.flag_url ?? null };
    })
    .sort((a, b) => (a.team === b.team ? a.name.localeCompare(b.name) : a.team.localeCompare(b.team)));

  const selected = ((ssRes.data ?? []) as SSRow[]).sort((a, b) => a.slot - b.slot).map((r) => r.player_id);

  const startStr = cfgRes.data?.group_stage_starts_at ?? firstRes.data?.kickoff_at ?? null;
  const locked = startStr ? Date.now() >= new Date(startStr).getTime() : false;

  return (
    <AppShell userName={name} points={points}>
      {players.length === 0 ? (
        <>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Goleadores</h1>
          <div className="card mt-5 p-8 text-center">
            <div className="text-4xl">🎯</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-dim)]">
              Aún no hay jugadores cargados en la base de datos. Ejecuta el seed de goleadores en Supabase y recarga.
            </p>
          </div>
        </>
      ) : (
        <ScorersPicker players={players} initialSelected={selected} locked={locked} />
      )}
    </AppShell>
  );
}
