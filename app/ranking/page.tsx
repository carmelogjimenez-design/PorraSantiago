import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
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
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Ranking</h1>

      <div className="card mt-5 flex items-end justify-center gap-3 p-6">
        {[{ h: 80, n: "2", c: "#c0c5cd" }, { h: 112, n: "1", c: "var(--accent)" }, { h: 64, n: "3", c: "#d59a5f" }].map((x, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-[var(--soft)] text-lg text-[var(--text-dim)]">?</div>
            <div className="grid place-items-start justify-center rounded-t-2xl pt-2.5 font-[family-name:var(--font-display)] text-xl font-extrabold text-white"
              style={{ height: x.h, background: x.c }}>{x.n}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-[var(--soft)] p-6 text-center">
        <div className="text-3xl">🏆</div>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-extrabold">El ranking se activa pronto</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-dim)]">
          En cuanto rueden los primeros partidos empezarás a sumar puntos y aquí verás el podio en directo.
          ¡Asegúrate de dejar todos tus pronósticos puestos!
        </p>
        <Link href="/grupos" className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white">
          Ir a pronosticar
        </Link>
      </div>
    </AppShell>
  );
}
