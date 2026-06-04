import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import PenaltyGame from "./penalty-game";

export const dynamic = "force-dynamic";

export default async function PenaltisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, ptsRes, rankRes, mineRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.rpc("get_penalty_ranking"),
    supabase.from("penalty_scores").select("best").eq("user_id", user.id).maybeSingle(),
  ]);

  const ranking = (rankRes.data ?? []) as Array<{ display_name: string; avatar_url: string | null; best: number }>;
  const myBest = mineRes.data?.best ?? 0;

  return (
    <AppShell userName={profileRes.data?.display_name ?? "Jugador"} points={Number(ptsRes.data ?? 0)}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Penaltis 🥅</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        5 tiros, engaña al portero y mete los que puedas. ¿Quién es el rey de los penaltis de la peña? 😏
      </p>
      <PenaltyGame initialRanking={ranking} initialBest={myBest} />
    </AppShell>
  );
}
