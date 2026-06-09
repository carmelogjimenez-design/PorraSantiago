"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type Row = { match_id: string; pred_home: number; pred_away: number };

export async function saveAdminPredictions(userId: string, rows: Row[]) {
  // 1) Comprobar que QUIEN llama es admin (con su sesión, en el servidor)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return { ok: false, error: "Solo el admin puede hacer esto" };

  if (!userId || rows.length === 0) return { ok: false, error: "Nada que guardar" };

  // 2) Validar marcadores (enteros >= 0)
  const clean = rows
    .filter(
      (r) =>
        !!r.match_id &&
        Number.isFinite(r.pred_home) &&
        Number.isFinite(r.pred_away) &&
        r.pred_home >= 0 &&
        r.pred_away >= 0
    )
    .map((r) => ({
      user_id: userId,
      match_id: r.match_id,
      pred_home: Math.trunc(r.pred_home),
      pred_away: Math.trunc(r.pred_away),
    }));

  if (clean.length === 0) return { ok: false, error: "Marcadores no válidos" };

  // 3) Escribir con el cliente de servicio (salta RLS; el candado lo trata
  //    como backend de confianza, así que funciona aunque el Mundial ya empezara)
  const admin = createAdminClient();
  const { error } = await admin
    .from("predictions")
    .upsert(clean, { onConflict: "user_id,match_id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/editar");
  return { ok: true, count: clean.length };
}
