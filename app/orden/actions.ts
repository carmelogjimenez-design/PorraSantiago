"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OrderState = { error?: string; ok?: boolean } | null;

export async function saveGroupOrder(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group_id = Number(formData.get("group_id"));
  const r1 = String(formData.get("rank1") ?? "");
  const r2 = String(formData.get("rank2") ?? "");
  const r3 = String(formData.get("rank3") ?? "");
  const r4 = String(formData.get("rank4") ?? "");

  const ids = [r1, r2, r3, r4];
  if (!group_id || ids.some((x) => !x) || new Set(ids).size !== 4)
    return { error: "Orden no válido / Invalid order" };

  const { error } = await supabase.from("group_predictions").upsert(
    {
      user_id: user.id,
      group_id,
      rank1_team_id: r1,
      rank2_team_id: r2,
      rank3_team_id: r3,
      rank4_team_id: r4,
    },
    { onConflict: "user_id,group_id" }
  );

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("lock") || msg.includes("bloque") || msg.includes("empez") || msg.includes("start"))
      return { error: "La fase de grupos ya empezó / Locked" };
    return { error: error.message };
  }
  revalidatePath("/orden");
  return { ok: true };
}
