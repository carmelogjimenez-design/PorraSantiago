import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import GoalsEditor from "../goals-editor";

export const dynamic = "force-dynamic";

export default async function GolesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: picks } = await admin.from("selected_scorers").select("player_id");
  const ids = Array.from(new Set(((picks ?? []) as Array<{ player_id: string }>).map((p) => p.player_id)));

  let players: Array<{ id: string; name: string; team: string; goals: number; override: number | null }> = [];
  if (ids.length) {
    const [pRes, tRes] = await Promise.all([
      admin.from("players").select("id,full_name,goals,goals_override,team_id").in("id", ids).order("full_name", { ascending: true }),
      admin.from("teams").select("id,name"),
    ]);
    const tn = new Map(((tRes.data ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]));
    players = ((pRes.data ?? []) as Array<{ id: string; full_name: string; goals: number | null; goals_override: number | null; team_id: string }>).map((p) => ({
      id: p.id,
      name: p.full_name,
      team: tn.get(p.team_id) ?? "?",
      goals: p.goals ?? 0,
      override: p.goals_override,
    }));
  }

  const { data: pts } = await supabase.rpc("get_my_points");

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(pts ?? 0)}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Goles 🎯</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Solo los goleadores que ha elegido la peña. Si el cruce automático falla, pon los goles a mano: <span className="font-bold text-[var(--text)]">mandan sobre el automático</span>. Deja vacío para volver al automático.
      </p>
      <GoalsEditor players={players} />
    </AppShell>
  );
}
