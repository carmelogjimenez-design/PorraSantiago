import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../../components/app-shell";
import PlayersAdmin from "../players-admin";

export const dynamic = "force-dynamic";

export default async function JugadoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const [playersRes, ptsRes] = await Promise.all([
    admin.from("profiles").select("id,display_name,has_paid").order("display_name", { ascending: true }),
    supabase.rpc("get_my_points"),
  ]);

  const players = ((playersRes.data ?? []) as Array<{ id: string; display_name: string | null; has_paid: boolean | null }>).map((p) => ({
    id: p.id,
    name: p.display_name ?? "Jugador",
    paid: !!p.has_paid,
  }));

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={Number(ptsRes.data ?? 0)}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Jugadores 👥</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Gestiona la peña. Eliminar a alguien borra su cuenta y todos sus pronósticos — <span className="font-bold text-[var(--accent)]">no se puede deshacer</span>.
      </p>
      <PlayersAdmin players={players} meId={user.id} />
    </AppShell>
  );
}
