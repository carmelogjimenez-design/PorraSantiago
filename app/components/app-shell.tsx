"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/grupos", label: "Fase de grupos", icon: "⚽" },
  { href: "/orden", label: "Orden de grupos", icon: "🗂️" },
  { href: "/goleadores", label: "Goleadores", icon: "🎯" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
  { href: "/reglas", label: "Reglas", icon: "📖" },
];

const MOBILE = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/grupos", label: "Grupos", icon: "⚽" },
  { href: "/goleadores", label: "Goleadores", icon: "🎯" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

function active(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

export default function AppShell({
  userName,
  points,
  children,
}: {
  userName: string;
  points: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto grid min-h-dvh max-w-[1240px] lg:grid-cols-[248px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--border)] bg-white px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex flex-col items-center border-b border-[var(--border)] pb-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="La Porra de Santiago" className="h-[78px] w-[72px]" />
          <div className="mt-2 text-base font-extrabold tracking-tight">LA PORRA</div>
          <div className="text-[11px] font-bold tracking-[0.26em] text-[var(--text-dim)]">
            DE SANTIAGO
          </div>
        </Link>

        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map((n) => {
            const on = active(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                  on
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-dim)] hover:bg-[var(--soft)] hover:text-[var(--text)]"
                }`}
              >
                <span className="text-lg">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/perfil"
          className="mt-auto flex items-center gap-3 rounded-2xl border border-[var(--border)] p-2.5"
        >
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--text)] text-sm font-extrabold text-white">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">{userName}</span>
            <span className="block text-[11px] text-[var(--text-dim)]">
              Rango: <b className="text-[var(--accent)]">Novato</b>
            </span>
            <span className="block text-sm font-extrabold">
              {points} <span className="text-[11px] font-bold text-[var(--text-dim)]">pts</span>
            </span>
          </span>
        </Link>
      </aside>

      {/* Main */}
      <div className="min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" className="h-8 w-8" />
            <span className="text-sm font-extrabold tracking-tight">
              LA PORRA <span className="text-[var(--text-dim)]">DE SANTIAGO</span>
            </span>
          </Link>
        </div>

        <div className="px-4 pb-28 pt-5 lg:px-7 lg:pb-10">{children}</div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-white/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE.map((n) => {
          const on = active(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${
                on ? "text-[var(--accent)]" : "text-[var(--text-dim)]"
              }`}
            >
              <span className="text-[21px] leading-none">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
