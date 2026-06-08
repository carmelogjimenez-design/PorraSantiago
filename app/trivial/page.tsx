import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import TriviaGame, { type RankRow } from "./game";

export const dynamic = "force-dynamic";

export default async function TrivialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, rankingRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.rpc("get_trivia_ranking"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const ranking = (rankingRes.data ?? []) as RankRow[];
  const myTotal = ranking.find((r) => r.user_id === user.id)?.points ?? 0;

  return (
    <AppShell userName={name} points={points}>
      <TriviaGame myId={user.id} myName={name} myTotal={myTotal} ranking={ranking} />
    </AppShell>
  );
}
