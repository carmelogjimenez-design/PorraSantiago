"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ScorerState = { error?: string; ok?: boolean } | null;

export async function saveScorers(_prev: ScorerState, formData: FormData): Promise<ScorerState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ¿bloqueado? (la fase de grupos ya empezó)
  const [{ data: cfg }, { data: firstM }] = await Promise.all([
    supabase.from("tournament_config").select("group_stage_starts_at").eq("id", 1).maybeSingle(),
    supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
  ]);
  const startStr = cfg?.group_stage_starts_at ?? firstM?.kickoff_at ?? null;
  if (startStr && Date.now() >= new Date(startStr).getTime())
    return { error: "El Mundial ya empezó / Locked" };

  const ids = [formData.get("player1"), formData.get("player2"), formData.get("player3")]
    .map((x) => (x ? String(x) : ""))
    .filter(Boolean);

  if (ids.length === 0) return { error: "Elige al menos 1 goleador / Pick at least 1" };
  if (new Set(ids).size !== ids.length) return { error: "No repitas jugador / No duplicates" };

  // Estrategia reemplazo: borrar los actuales y volver a insertar en slots 1..n
  const del = await supabase.from("selected_scorers").delete().eq("user_id", user.id);
  if (del.error) return { error: del.error.message };

  const rows = ids.map((player_id, i) => ({ user_id: user.id, player_id, slot: i + 1 }));
  const ins = await supabase.from("selected_scorers").insert(rows);
  if (ins.error) return { error: ins.error.message };

  revalidatePath("/goleadores");
  return { ok: true };
}
