import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import EditarForm from "./editar-form";
export const dynamic = "force-dynamic";
export default async function EditarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("display_name,role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");
  const { data: pts } = await supabase.rpc("get_my_points");
  const admin = createAdminClient();
  const [playersRes, matchesRes, teamsRes, predsRes, groupsRes] = await Promise.all([
    admin.from("profiles").select("id,display_name").order("display_name", { ascending: true }),
    admin.from("matches").select("id,group_id,home_team_id,away_team_id,kickoff_at"),
    admin.from("teams").select("id,name"),
    admin.from("predictions").select("user_id,match_id,pred_home,pred_away"),
    admin.from("groups").select("id,label").order("id", { ascending: true }),
  ]);
  const players = (playersRes.data ?? []) as { id: string; display_name: string | null }[];
  const teams = (teamsRes.data ?? []) as { id: string; name: string }[];
  const rawMatches = (matchesRes.data ?? []) as {
    id: string;
    group_id: number | null;
    home_team_id: string | null;
    away_team_id: string | null;
    kickoff_at: string | null;
  }[];
  const preds = (predsRes.data ?? []) as {
    user_id: string;
    match_id: string;
    pred_home: number;
    pred_away: number;
  }[];
  const groups = (groupsRes.data ?? []) as { id: number; label: string }[];
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  // Mostrar TODOS los partidos (incluidos los que no tienen group_id: eliminatoria, etc.)
  const matches = rawMatches
    .map((m) => ({
      id: m.id,
      group_id: m.group_id, // number | null  (null = sin grupo -> sección "Otros")
      kickoff_at: m.kickoff_at,
      home: m.home_team_id ? teamName.get(m.home_team_id) ?? "?" : "?",
      away: m.away_team_id ? teamName.get(m.away_team_id) ?? "?" : "?",
    }))
    .sort((a, b) => {
      const ga = a.group_id ?? 9999; // sin grupo al final
      const gb = b.group_id ?? 9999;
      if (ga !== gb) return ga - gb;
      return (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? "");
    });
  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(pts ?? 0)}>
      <EditarForm players={players} matches={matches} groups={groups} preds={preds} />
    </AppShell>
  );
}
