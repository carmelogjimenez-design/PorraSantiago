"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Devuelve el usuario solo si es admin; si no, null
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return me?.role === "admin" ? user : null;
}

export async function forceSync() {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "No autorizado" };

  const h = await headers();
  const host = h.get("host") || "";
  const proto = host.includes("localhost") ? "http" : "https";
  try {
    const res = await fetch(`${proto}://${host}/api/sync?secret=${process.env.SYNC_SECRET}`, { cache: "no-store" });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Editar un resultado a mano (lo marca como manual: el sync no lo pisará)
export async function saveMatch(matchId: string, home: number | null, away: number | null, finished: boolean) {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin.from("matches").update({
    home_score: home,
    away_score: away,
    status: finished ? "finished" : "scheduled",
    manual_override: true,
    updated_at: new Date().toISOString(),
  }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/resultados");
  return { ok: true };
}

// Devolver un partido al control automático del sync
export async function releaseMatch(matchId: string) {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin.from("matches").update({ manual_override: false }).eq("id", matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/resultados");
  return { ok: true };
}

// Ajustar los goles de un jugador a mano (null = volver al automático)
export async function saveGoals(playerId: string, goalsOverride: number | null) {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "No autorizado" };

  const admin = createAdminClient();
  const { error } = await admin.from("players").update({ goals_override: goalsOverride }).eq("id", playerId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/goles");
  return { ok: true };
}

// Eliminar a un jugador del todo (cuenta + todos sus datos). Irreversible.
export async function deleteUser(userId: string) {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "No autorizado" };
  if (userId === user.id) return { ok: false, error: "No puedes eliminarte a ti mismo" };

  const admin = createAdminClient();
  try {
    await admin.from("predictions").delete().eq("user_id", userId);
    await admin.from("group_predictions").delete().eq("user_id", userId);
    await admin.from("selected_scorers").delete().eq("user_id", userId);
    await admin.from("penalty_scores").delete().eq("user_id", userId);
    await admin.from("ranking_snapshots").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  revalidatePath("/admin/jugadores");
  revalidatePath("/admin/estado");
  return { ok: true };
}
