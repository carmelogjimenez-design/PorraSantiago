"use server";

import { createClient } from "@/lib/supabase/server";

export type KoState = { ok?: boolean; error?: string } | null;

// Guardar un pronóstico de un partido KO
export async function saveKnockoutPick(_prev: KoState, formData: FormData): Promise<KoState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No has iniciado sesión." };

  const matchId = String(formData.get("match_id") ?? "");
  const ph = Number(formData.get("pred_home"));
  const pa = Number(formData.get("pred_away"));
  if (!matchId) return { error: "Partido no válido." };
  if (!Number.isInteger(ph) || !Number.isInteger(pa) || ph < 0 || pa < 0)
    return { error: "Pon un marcador válido (números ≥ 0)." };

  const { error } = await supabase
    .from("knockout_picks")
    .upsert({ user_id: user.id, match_id: matchId, pred_home: ph, pred_away: pa }, { onConflict: "user_id,match_id" });
  if (error) {
    if (error.message.includes("bloqueado") || error.message.includes("locked"))
      return { error: "Ese partido ya ha empezado, no se puede cambiar." };
    return { error: "No se pudo guardar. Inténtalo otra vez." };
  }
  return { ok: true };
}

// Guardar los 3 goleadores de la fase final (reemplaza la selección anterior)
export async function saveFinalScorers(_prev: KoState, formData: FormData): Promise<KoState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No has iniciado sesión." };

  const ids = formData.getAll("player_id").map((x) => String(x)).filter(Boolean);
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { error: "Elige al menos un goleador." };
  if (unique.length > 3) return { error: "Máximo 3 goleadores." };

  // Reemplazo limpio: borro los actuales y meto los nuevos
  const del = await supabase.from("final_scorers").delete().eq("user_id", user.id);
  if (del.error) return { error: "No se pudo actualizar. Inténtalo otra vez." };
  const rows = unique.map((player_id) => ({ user_id: user.id, player_id }));
  const { error } = await supabase.from("final_scorers").insert(rows);
  if (error) return { error: "No se pudo guardar los goleadores." };
  return { ok: true };
}

// Guardar campeón y subcampeón
export async function saveFinalPicks(_prev: KoState, formData: FormData): Promise<KoState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No has iniciado sesión." };

  const champion = String(formData.get("champion_id") ?? "") || null;
  const runnerup = String(formData.get("runnerup_id") ?? "") || null;
  if (champion && runnerup && champion === runnerup)
    return { error: "Campeón y subcampeón no pueden ser el mismo equipo." };

  const { error } = await supabase
    .from("final_picks")
    .upsert({ user_id: user.id, champion_id: champion, runnerup_id: runnerup, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "No se pudo guardar. Inténtalo otra vez." };
  return { ok: true };
}
