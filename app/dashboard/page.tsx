import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, favorite_country")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name ?? "Jugador";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="rise mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-dim)]">
            Mundial 2026
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight font-[family-name:var(--font-display)]">
            Hola, {name}
          </h1>
        </div>
        <form action={signOut}>
          <button className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-dim)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Salir
          </button>
        </form>
      </header>

      {/* Tarjeta de perfil / Profile card */}
      <section className="card rise p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--accent)] text-2xl font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold">{name}</p>
            <p className="text-sm text-[var(--text-dim)]">{user.email}</p>
            {profile?.favorite_country && (
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                ⭐ {profile.favorite_country}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/perfil"
          className="mt-5 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--accent-deep)]"
        >
          Editar perfil
        </Link>
      </section>

      {/* Accesos rápidos (rutas que construiremos después) */}
      <nav className="rise mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: "/grupos", label: "Fase de grupos" },
          { href: "/mis-pronosticos", label: "Mis pronósticos" },
          { href: "/goleadores", label: "Goleadores" },
          { href: "/ranking", label: "Ranking" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card p-4 text-center text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
