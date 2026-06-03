"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string } | null;

// --- Registro / Sign up --- (compatible con useActionState)
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const displayName = String(formData.get("display_name"));

  if (!displayName?.trim()) return { error: "El nombre es obligatorio / Name is required" };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    // El trigger handle_new_user lee este metadato para crear el perfil.
    options: { data: { display_name: displayName.trim() } },
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// --- Login ---
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const redirectTo = String(formData.get("redirect") || "/dashboard");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

// --- Logout ---
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
