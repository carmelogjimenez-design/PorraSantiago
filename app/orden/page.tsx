import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import GroupOrderCard, { type Team } from "./group-order-card";

export const dynamic = "force-dynamic";

type GroupRow = { id: number; label: string };
type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type GPRow = {
  group_id: number;
  rank1_team_id: string; rank2_team_id: string; rank3_team_id: string; rank4_team_id: string;
};

export default async function OrdenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, groupsRes, teamsRes, gpRes, cfgRes, firstRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("groups").select("id,label").order("id"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("group_predictions").select("group_id,rank1_team_id,rank2_team_id,rank3_team_id,rank4_team_id").eq("user_id", user.id),
    supabase.from("tournament_config").select("group_stage_starts_at").eq("id", 1).maybeSingle(),
    supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const gps = (gpRes.data ?? []) as GPRow[];

  const startStr = cfgRes.data?.group_stage_starts_at ?? firstRes.data?.kickoff_at ?? null;
  const locked = startStr ? Date.now() >= new Date(startStr).getTime() : false;

  const gpByGroup = new Map<number, GPRow>(gps.map((g) => [g.group_id, g]));
  const teamsByGroup = new Map<number, Team[]>();
  for (const t of teams) {
    if (t.group_id == null) continue;
    const arr = teamsByGroup.get(t.group_id) ?? [];
    arr.push({ id: t.id, name: t.name, flag: t.flag_url });
    teamsByGroup.set(t.group_id, arr);
  }

  const doneCount = gps.length;

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Orden de grupos</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Ordena cada grupo del 1º al 4º. Puntos por acierto: <b className="text-[var(--text)]">1º = 10 · 2º = 5 · 3º = 3 · 4º = 4</b>.
      </p>

      <div className="sticky top-0 z-20 mt-4 -mx-4 border-y border-[var(--border)] bg-white/90 px-4 py-3 backdrop-blur-lg lg:mx-0 lg:rounded-2xl lg:border">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-[var(--text-dim)]">Grupos ordenados</span>
          <span><b className="font-extrabold text-[var(--accent)]">{doneCount}</b><span className="text-[var(--text-dim)]"> / {groups.length}</span></span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--soft)]">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
            style={{ width: `${groups.length ? Math.round((doneCount / groups.length) * 100) : 0}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {groups.map((g) => {
          const gteams = teamsByGroup.get(g.id) ?? [];
          if (gteams.length < 4) return null;
          const gp = gpByGroup.get(g.id);
          const initial = gp
            ? [gp.rank1_team_id, gp.rank2_team_id, gp.rank3_team_id, gp.rank4_team_id]
            : gteams.map((t) => t.id);
          return (
            <GroupOrderCard
              key={g.id}
              groupId={g.id}
              label={g.label}
              teams={gteams}
              initialOrder={initial}
              locked={locked}
              savedAlready={!!gp}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
