"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BIZUM = "+34 659 38 46 48";

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
const active = (p: string, h: string) => (h === "/dashboard" ? p === "/dashboard" : p.startsWith(h));

export default function AppShell({
  userName, points, children,
}: { userName: string; points: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const initial = userName.charAt(0).toUpperCase();

  const [status, setStatus] = useState<"loading" | "paid" | "unpaid">("loading");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("paid"); return; } // sin sesión, deja pasar (la página ya redirige)
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("has_paid").eq("id", user.id).single();
      setStatus(data?.has_paid ? "paid" : "unpaid");
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (status === "unpaid") {
    return (
      <>
        <Onboarding />
        <PaymentGate userId={userId} onPaid={() => setStatus("paid")} />
      </>
    );
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-[1240px] lg:grid-cols-[248px_1fr]">
      <Onboarding />

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--border)] bg-white px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex flex-col items-center border-b border-[var(--border)] pb-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="La Porra de Santiago" className="h-[78px] w-[72px]" />
          <div className="mt-2 text-base font-extrabold tracking-tight">LA PORRA</div>
          <div className="text-[11px] font-bold tracking-[0.26em] text-[var(--text-dim)]">DE SANTIAGO</div>
        </Link>

        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map((n) => {
            const on = active(pathname, n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                  on ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-dim)] hover:bg-[var(--soft)] hover:text-[var(--text)]"}`}>
                <span className="text-lg">{n.icon}</span>{n.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/perfil" className="mt-auto flex items-center gap-3 rounded-2xl border border-[var(--border)] p-2.5">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--text)] text-sm font-extrabold text-white">{initial}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">{userName}</span>
            <span className="block text-[11px] text-[var(--text-dim)]">Rango: <b className="text-[var(--accent)]">Novato</b></span>
            <span className="block text-sm font-extrabold">{points} <span className="text-[11px] font-bold text-[var(--text-dim)]">pts</span></span>
          </span>
        </Link>
      </aside>

      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" className="h-8 w-8" />
            <span className="text-sm font-extrabold tracking-tight">LA PORRA <span className="text-[var(--text-dim)]">DE SANTIAGO</span></span>
          </Link>
        </div>
        <div className="px-4 pb-28 pt-5 lg:px-7 lg:pb-10">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-white/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {MOBILE.map((n) => {
          const on = active(pathname, n.href);
          return (
            <Link key={n.href} href={n.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${on ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>
              <span className="text-[21px] leading-none">{n.icon}</span>{n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* ---------- Popup de bienvenida (cómo funciona) ---------- */
function Onboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem("porra_onboarded")) setShow(true); } catch {} }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem("porra_onboarded", "1"); } catch {} setShow(false); };
  const steps = [
    { icon: "⚽", t: "Pronostica los partidos", d: "Marca el resultado exacto. 3 puntos si lo clavas, 1 si aciertas el ganador." },
    { icon: "👑", t: "Orden de grupos y goleadores", d: "Ordena cada grupo y elige tus 3 goleadores para sumar puntos extra." },
    { icon: "🏆", t: "Sube en el ranking", d: "Cada acierto cuenta. Compite con la peña hasta la final." },
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Bienvenido</div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">La Porra de Santiago</h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">Así funciona, en 3 pasos:</p>
        <div className="mt-5 space-y-4">
          {steps.map((s) => (
            <div key={s.t} className="flex gap-3">
              <span className="text-2xl leading-none">{s.icon}</span>
              <div><div className="text-sm font-bold">{s.t}</div><div className="text-sm text-[var(--text-dim)]">{s.d}</div></div>
            </div>
          ))}
        </div>
        <button onClick={close} className="mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-base font-bold text-white transition hover:bg-[var(--accent-deep)]">¡Vamos! 🚀</button>
      </div>
    </div>
  );
}

/* ---------- Pantalla de Bizum (bloqueo) ---------- */
function PaymentGate({ userId, onPaid }: { userId: string | null; onPaid: () => void }) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!userId) return;
    setPending(true); setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ has_paid: true }).eq("id", userId);
      if (error) { setError(error.message); setPending(false); return; }
      onPaid();
    } catch (e) {
      setError("No se pudo guardar, inténtalo de nuevo"); setPending(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(BIZUM.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-icon.svg" alt="" className="h-20 w-[74px]" />
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">Únete a la porra</h1>
      <p className="mt-2 text-sm text-[var(--text-dim)]">
        Para participar, haz un <b className="text-[var(--text)]">Bizum</b> a este número. Cuando lo hayas hecho, pulsa el botón de abajo.
      </p>

      <button onClick={copy}
        className="mt-5 w-full rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-5">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--accent-deep)]">Bizum a</div>
        <div className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">{BIZUM}</div>
        <div className="mt-1 text-[11px] font-bold text-[var(--text-dim)]">{copied ? "¡Copiado! ✓" : "Toca para copiar"}</div>
      </button>

      <button onClick={confirm} disabled={pending}
        className="mt-5 w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-extrabold text-white transition active:scale-95 disabled:opacity-50">
        {pending ? "Un momento…" : "✅ Ya he hecho el Bizum"}
      </button>
      {error && <p className="mt-2 text-xs font-bold text-[var(--accent-deep)]">{error}</p>}
      <p className="mt-4 text-[11px] text-[var(--text-dim)]">
        Lo comprobaremos manualmente. Si marcas esto sin haber pagado… el karma futbolístico te lo hará pagar. 😉
      </p>
    </div>
  );
}
