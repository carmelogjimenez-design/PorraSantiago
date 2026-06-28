import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import BracketCompletionList from "./bracket-completion-list";
export const dynamic = "force-dynamic";

export default async function CuadroEstadoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  // Leemos TODOS los cuadros con el admin client (bracket_picks tiene RLS de solo-dueño)
  const [profilesRes, bracketRes, ptsRes] = await Promise.all([
    admin.from("profiles").select("id,display_name"),
    admin.from("bracket_picks").select("user_id,slot"),
    supabase.rpc("get_my_points"),
  ]);

  type Prof = { id: string; display_name: string | null };
  type Bp = { user_id: string; slot: string };
  const profiles = (profilesRes.data ?? []) as Prof[];
  const picks = (bracketRes.data ?? []) as Bp[];

  // Cuenta de slots distintos por usuario (por si hubiera duplicados, contamos únicos)
  const bySlotSet = new Map<string, Set<string>>();
  for (const p of picks) {
    if (!bySlotSet.has(p.user_id)) bySlotSet.set(p.user_id, new Set());
    bySlotSet.get(p.user_id)!.add(p.slot);
  }

  const rows = profiles
    .map((pr) => ({
      user_id: pr.id,
      display_name: pr.display_name ?? "Jugador",
      picks_done: bySlotSet.get(pr.id)?.size ?? 0,
    }))
    .sort((a, b) => b.picks_done - a.picks_done || a.display_name.localeCompare(b.display_name));

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(ptsRes.data ?? 0)}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Estado del cuadro 🗺️</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Quién tiene el cuadro de la fase final completo y a quién le falta. <span className="font-bold text-[var(--text)]">No se ven los pronósticos</span>, solo cuántos cruces lleva cada uno.
      </p>
      <BracketCompletionList rows={rows} />
    </AppShell>
  );
}
