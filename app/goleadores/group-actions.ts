"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ScorerGroupState = { ok?: boolean; error?: string } | null;

export async function saveGroupScorers(_prev: ScorerGroupState, formData: FormData): Promise<ScorerGroupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No has iniciado sesión" };

  // Recoger 1 jugador por grupo (slot = nº de grupo, 1..12)
  const rows: { user_id: string; player_id: string; slot: number }[] = [];
  for (let gid = 1; gid <= 12; gid++) {
    const pid = formData.get(`g${gid}`);
    if (typeof pid === "string" && pid) rows.push({ user_id: user.id, player_id: pid, slot: gid });
  }
  if (rows.length === 0) return { error: "Elige al menos un goleador" };

  // Reemplazar las elecciones del usuario (borrar las suyas + insertar)
  const del = await supabase.from("selected_scorers").delete().eq("user_id", user.id);
  if (del.error) return { error: del.error.message };
  const ins = await supabase.from("selected_scorers").insert(rows);
  if (ins.error) return { error: ins.error.message };

  revalidatePath("/goleadores");
  return { ok: true };
}
