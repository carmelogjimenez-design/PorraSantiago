import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import GoleadoresViewer, { type PlayerOpt, type GroupVM, type ScorerVM } from "./viewer";
export const dynamic = "force-dynamic";

type PlayerRow = { id: string; full_name: string; team_id: string; goals: number | null; goals_override: number | null };
type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type SSRow = { user_id: string; player_id: string; slot: number };

// Trae TODO selected_scorers por páginas de 1000 (el servidor topa cada respuesta en 1000).
async function fetchAllScorers(admin: ReturnType<typeof createAdminClient>): Promise<SSRow[]> {
  const pageSize = 1000;
  let from = 0;
  const all: SSRow[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const { data, error } = await admin
      .from("selected_scorers")
      .select("user_id,player_id,slot")
      .order("user_id", { ascending: true })
      .order("slot", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as SSRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export default async function AdminGoleadoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");
  const { data: pts } = await supabase.rpc("get_my_points");

  const admin = createAdminClient();
  const [playersRes, profilesRes, teamsRes, groupsRes, ssAll] = await Promise.all([
    admin.from("profiles").select("id,display_name").order("display_name", { ascending: true }),
    Promise.resolve(null),
    admin.from("teams").select("id,name,flag_url,group_id"),
    admin.from("groups").select("id,label").order("id", { ascending: true }),
    fetchAllScorers(admin),
  ]);
  void profilesRes;

  // Jugadores (perfiles) para el selector
  const profiles = (playersRes.data ?? []) as { id: string; display_name: string | null }[];
  const playerOpts: PlayerOpt[] = profiles.map((p) => ({ id: p.id, name: p.display_name ?? "Jugador" }));

  // Jugadores-goleadores (tabla players) por páginas de 1000
  const p1 = await admin.from("players").select("id,full_name,team_id,goals,goals_override").order("full_name").range(0, 999);
  const p2 = await admin.from("players").select("id,full_name,team_id,goals,goals_override").order("full_name").range(1000, 1999);
  const playersRaw = ([...(p1.data ?? []), ...(p2.data ?? [])]) as PlayerRow[];

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const groups = (groupsRes.data ?? []) as { id: number; label: string }[];
  const groupVMs: GroupVM[] = groups.map((g) => ({ id: g.id, label: g.label }));

  // Mapa player_id -> info de goleador (nombre, equipo, bandera, goles, grupo)
  const scorerById = new Map<string, ScorerVM>();
  for (const p of playersRaw) {
    const t = teamById.get(p.team_id);
    scorerById.set(p.id, {
      id: p.id,
      name: p.full_name,
      team: t?.name ?? "?",
      flag: t?.flag_url ?? null,
      groupId: t?.group_id ?? 0,
      goals: p.goals_override ?? p.goals ?? 0,
    });
  }

  // Elecciones por usuario: userId -> { slot(grupo) -> ScorerVM }
  const picksByUser: Record<string, Record<number, ScorerVM>> = {};
  for (const r of ssAll) {
    if (r.slot < 1 || r.slot > 12) continue;
    const sc = scorerById.get(r.player_id);
    if (!sc) continue;
    (picksByUser[r.user_id] ??= {})[r.slot] = sc;
  }

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(pts ?? 0)}>
      <GoleadoresViewer players={playerOpts} groups={groupVMs} picksByUser={picksByUser} />
    </AppShell>
  );
}
