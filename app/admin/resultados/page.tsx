import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import ResultEditor from "../result-editor";

export const dynamic = "force-dynamic";

const GROUP_LABELS = ["", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function ResultadosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const [mRes, tRes, ptsRes] = await Promise.all([
    admin.from("matches").select("id,group_id,kickoff_at,status,home_score,away_score,manual_override,home_team_id,away_team_id").order("kickoff_at", { ascending: true }),
    admin.from("teams").select("id,name"),
    supabase.rpc("get_my_points"),
  ]);

  const teamName = new Map(((tRes.data ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]));
  const matches = ((mRes.data ?? []) as Array<{
    id: string; group_id: number | null; kickoff_at: string | null; status: string;
    home_score: number | null; away_score: number | null; manual_override: boolean;
    home_team_id: string; away_team_id: string;
  }>).map((m) => ({
    id: m.id,
    group: m.group_id ? (GROUP_LABELS[m.group_id] ?? "") : "",
    kickoff: m.kickoff_at,
    status: m.status,
    home_score: m.home_score,
    away_score: m.away_score,
    manual: m.manual_override,
    homeName: teamName.get(m.home_team_id) ?? "?",
    awayName: teamName.get(m.away_team_id) ?? "?",
  }));

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(ptsRes.data ?? 0)}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Resultados 🚨</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Tu red de seguridad. Edita un marcador y márcalo terminado: el ranking recalcula solo. Lo que edites aquí, el sync <span className="font-bold text-[var(--text)]">no lo pisa</span>.
      </p>
      <ResultEditor matches={matches} />
    </AppShell>
  );
}
