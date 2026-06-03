import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "../components/bottom-nav";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 pb-28 pt-6">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm font-bold text-[var(--text-dim)]">
          ← Inicio
        </Link>
        <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
          Ranking
        </h1>
      </header>

      {/* Podio en espera / waiting podium */}
      <section className="card rise flex items-end justify-center gap-3 p-6">
        {[
          { h: "h-20", n: "2", c: "bg-[#c0c5cd]" },
          { h: "h-28", n: "1", c: "bg-[var(--accent)]" },
          { h: "h-16", n: "3", c: "bg-[#d59a5f]" },
        ].map((p, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-soft)] text-lg text-[var(--text-dim)]">
              ?
            </div>
            <div
              className={`${p.h} ${p.c} grid place-items-start justify-center rounded-t-2xl pt-2.5 font-[family-name:var(--font-display)] text-xl font-extrabold text-white`}
            >
              {p.n}
            </div>
          </div>
        ))}
      </section>

      <div className="rise mt-6 rounded-2xl bg-[var(--bg-soft)] p-6 text-center">
        <div className="text-3xl">🏆</div>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-extrabold">
          El ranking se activa pronto
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-dim)]">
          En cuanto rueden los primeros partidos del Mundial empezarás a sumar
          puntos y aquí verás el podio en directo. De momento, ¡asegúrate de
          dejar todos tus pronósticos puestos!
        </p>
        <Link
          href="/grupos"
          className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white transition active:scale-95"
        >
          Ir a pronosticar
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
