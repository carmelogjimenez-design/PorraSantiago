import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import CompletionList from "../completion-list";

export const dynamic = "force-dynamic";

export default async function EstadoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const [statusRes, matchesRes, ptsRes] = await Promise.all([
    supabase.rpc("get_completion_status"),
    admin.from("matches").select("id", { count: "exact", head: true }),
    supabase.rpc("get_my_points"),
  ]);

  const rows = (statusRes.data ?? []) as Array<{
    user_id: string; display_name: string; matches_done: number; groups_done: number; scorers_done: number;
  }>;
  const matchesTotal = matchesRes.count ?? 72;

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(ptsRes.data ?? 0)}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Estado de las porras 📋</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Quién lo tiene todo y a quién le falta, para que puedas dar el toque. <span className="font-bold text-[var(--text)]">No se ven pronósticos</span>, solo cuánto lleva cada uno.
      </p>
      <CompletionList rows={rows} matchesTotal={matchesTotal} />
    </AppShell>
  );
}
