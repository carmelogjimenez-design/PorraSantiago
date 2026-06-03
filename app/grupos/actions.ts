"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PredState = { error?: string; ok?: boolean } | null;

export async function savePrediction(
  _prev: PredState,
  formData: FormData
): Promise<PredState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const match_id = String(formData.get("match_id") ?? "");
  const pred_home = Number(formData.get("pred_home"));
  const pred_away = Number(formData.get("pred_away"));

  if (
    !match_id ||
    Number.isNaN(pred_home) ||
    Number.isNaN(pred_away) ||
    pred_home < 0 ||
    pred_away < 0
  ) {
    return { error: "Pon un resultado válido / Enter a valid score" };
  }

  const { error } = await supabase.from("predictions").upsert(
    { user_id: user.id, match_id, pred_home, pred_away },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("lock") || msg.includes("bloque") || msg.includes("kickoff")) {
      return { error: "El partido ya empezó, pronóstico bloqueado / Match locked" };
    }
    return { error: error.message };
  }

  revalidatePath("/grupos");
  return { ok: true };
}
