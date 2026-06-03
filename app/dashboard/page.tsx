import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import Onboarding from "./onboarding";
import Countdown from "./countdown";
import BottomNav from "../components/bottom-nav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, totalRes, doneRes, firstRes, ptsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, favorite_country")
      .eq("id", user.id)
      .single(),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("matches")
      .select("kickoff_at")
      .order("kickoff_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("predictions").select("points").eq("user_id", user.id),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const total = totalRes.count ?? 72;
  const done = doneRes.count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const kickoff = firstRes.data?.kickoff_at ?? "2026-06-11T16:00:00Z";
  const points = (ptsRes.data ?? []).reduce(
    (acc, r: { points: number | null }) => acc + (r.points ?? 0),
    0
  );

  // Anillo de progreso / progress ring math (r = 19)
  const R = 19;
  const C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 pb-28 pt-6">
      <Onboarding />

      <header className="rise mb-1 flex items-center justify-between">
        <div className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">
          La Porra de <span className="text-[var(--accent)]">Santiago</span>
        </div>
        <form action={signOut}>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-extrabold text-white">
            {name.charAt(0).toUpperCase()}
          </button>
        </form>
      </header>

      {/* Hero con cuenta atrás / hero with live countdown */}
      <section className="rise relative mt-4 overflow-hidden rounded-3xl bg-[var(--text)] p-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent)]" />
        <p className="relative z-[2] text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8a99]">
          Mundial 2026 · 48 selecciones
        </p>
        <h1 className="relative z-[2] mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold leading-[1.05] tracking-tight">
          Hola, {name} 👋
        </h1>
        <Countdown target={kickoff} />
      </section>

      {/* Stats reales / real stats */}
      <section className="rise mt-3.5 flex gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-[var(--bg-soft)] p-3.5">
          <div className="relative h-[46px] w-[46px] flex-none">
            <svg width="46" height="46" className="-rotate-90">
              <circle
                cx="23"
                cy="23"
                r={R}
                fill="none"
                stroke="var(--border)"
                strokeWidth="5"
              />
              <circle
                cx="23"
                cy="23"
                r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-[12px] font-extrabold">
              {pct}%
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-none">
              {done}
              <span className="text-sm text-[var(--text-dim)]">/{total}</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-dim)]">
              pronosticados
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-[var(--bg-soft)] p-3.5">
          <div className="grid h-[46px] w-[46px] flex-none place-items-center rounded-xl bg-[var(--accent-soft)] font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--accent-deep)]">
            🏆
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-none">
              {points}
              <span className="text-sm text-[var(--text-dim)]"> pts</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-dim)]">
              ranking pronto
            </div>
          </div>
        </div>
      </section>

      <h2 className="mb-3 mt-6 font-[family-name:var(--font-display)] text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-dim)]">
        Tu juego
      </h2>

      <nav className="stagger grid grid-cols-2 gap-3">
        {[
          {
            href: "/grupos",
            icon: "⚽",
            t: "Fase de grupos",
            s: `${total - done} sin pronosticar`,
          },
          {
            href: "/grupos",
            icon: "🥇",
            t: "Orden de grupos",
            s: "Predice 1º y 2º",
          },
          {
            href: "/grupos",
            icon: "🎯",
            t: "Goleadores",
            s: "Elige tus 3 cracks",
          },
          { href: "/ranking", icon: "🏆", t: "Ranking", s: "A por el oro" },
        ].map((c) => (
          <Link
            key={c.t}
            href={c.href}
            className="card flex flex-col gap-2.5 p-4 transition active:scale-[0.97]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-xl">
              {c.icon}
            </span>
            <span className="text-[15px] font-bold">{c.t}</span>
            <span className="text-xs text-[var(--text-dim)]">{c.s}</span>
          </Link>
        ))}
      </nav>

      <BottomNav />
    </main>
  );
}
