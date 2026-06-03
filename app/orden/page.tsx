import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";

export const dynamic = "force-dynamic";

export default async function OrdenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [p, pts] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("predictions").select("points").eq("user_id", user.id),
  ]);
  const name = p.data?.display_name ?? "Jugador";
  const points = (pts.data ?? []).reduce((a, r: { points: number | null }) => a + (r.points ?? 0), 0);

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Orden de grupos</h1>
      <div className="card mt-5 p-8 text-center">
        <div className="text-4xl">👑</div>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-extrabold">Muy pronto</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-dim)]">
          Aquí podrás predecir cómo quedará cada grupo (1º, 2º, 3º y 4º) para sumar puntos extra.
          Lo activamos en el siguiente bloque.
        </p>
        <Link href="/grupos" className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white">
          Ir a la fase de grupos
        </Link>
      </div>
    </AppShell>
  );
}
