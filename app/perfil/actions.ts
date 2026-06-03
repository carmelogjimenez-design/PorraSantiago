"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; ok?: boolean } | null;

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const display_name = String(formData.get("display_name") || "").trim();
  const favorite_country = String(formData.get("favorite_country") || "").trim() || null;
  const avatar_url = String(formData.get("avatar_url") || "").trim() || null;

  if (!display_name) return { error: "El nombre no puede estar vacío / Name can't be empty" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, favorite_country, avatar_url })
    .eq("id", user.id); // RLS garantiza que solo edita el suyo / RLS ensures own row only

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/perfil");
  return { ok: true };
}
