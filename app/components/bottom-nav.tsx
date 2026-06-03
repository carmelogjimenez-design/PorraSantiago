"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/grupos", label: "Grupos", icon: "⚽" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/90 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((t) => {
          const active =
            t.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${
                active ? "text-[var(--accent)]" : "text-[var(--text-dim)]"
              }`}
            >
              <span className="text-[22px] leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
