"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function forceSync() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { ok: false, error: "No autorizado" };

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
