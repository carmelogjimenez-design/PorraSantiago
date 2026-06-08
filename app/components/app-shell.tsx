"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./icons";
import Avatar from "./avatar";

const BIZUM = "+34 635 80 25 46";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "/grupos", label: "Fase de grupos", icon: "ball" },
  { href: "/orden", label: "Orden de grupos", icon: "grid" },
  { href: "/pronosticos", label: "Pronósticos", icon: "eye" },
  { href: "/goleadores", label: "Goleadores", icon: "target" },
  { href: "/ranking", label: "Ranking", icon: "trophy" },
  { href: "/premios", label: "Premios", icon: "gift" },
  { href: "/trivial", label: "Trivial", icon: "bulb" },
  { href: "/reglas", label: "Reglas", icon: "book" },
];
const MOBILE = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "/grupos", label: "Grupos", icon: "ball" },
  { href: "/goleadores", label: "Goleadores", icon: "target" },
  { href: "/ranking", label: "Ranking", icon: "trophy" },
];
const MORE = [
  { href: "/pronosticos", label: "Pronósticos", icon: "eye" },
  { href: "/orden", label: "Orden de grupos", icon: "grid" },
  { href: "/premios", label: "Premios", icon: "gift" },
  { href: "/trivial", label: "Trivial", icon: "bulb" },
  { href: "/reglas", label: "Reglas", icon: "book" },
  { href: "/perfil", label: "Perfil", icon: "user" },
];
const active = (p: string, h: string) => (h === "/dashboard" ? p === "/dashboard" : p.startsWith(h));

async function doSignOut() {
  try { await createClient().auth.signOut(); } catch {}
  window.location.href = "/login";
}

export default function AppShell({
  userName, points, children,
}: { userName: string; points: number; children: React.ReactNode }) {
  const pathname = usePathname();

  const [status, setStatus] = useState<"loading" | "paid" | "unpaid">("loading");
  const [onboarded, setOnboarded] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("paid"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("has_paid,onboarded,avatar_url").eq("id", user.id).single();
      setOnboarded(Boolean(data?.onboarded));
      setAvatar(data?.avatar_url ?? null);
      const unpaid = !data?.has_paid;
      setStatus(unpaid ? "unpaid" : "paid");
      if (unpaid) setPayOpen(true);
    })();
  }, []);

  const closeOnboarding = async () => {
    setOnboarded(true);
    if (userId) { try { await createClient().from("profiles").update({ onboarded: true }).eq("id", userId); } catch {} }
  };

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  const onboarding = !onboarded ? <Onboarding onClose={closeOnboarding} /> : null;

  return (
    <div className="mx-auto grid min-h-dvh max-w-[1240px] lg:grid-cols-[248px_1fr]">
      {onboarding}

      {status === "unpaid" && (
        <>
          <button onClick={() => setPayOpen(true)}
            className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-extrabold text-white shadow-lg transition active:scale-95 lg:bottom-6">
            💸 Pagar Bizum
          </button>
          <PaymentReminder open={payOpen} userId={userId}
            onClose={() => setPayOpen(false)}
            onPaid={() => { setStatus("paid"); setPayOpen(false); }} />
        </>
      )}

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
                <Icon name={n.icon} className="h-5 w-5 flex-none" />{n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Link href="/perfil" className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-2.5">
            <Avatar src={avatar} name={userName} className="h-10 w-10" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold">{userName}</span>
              <span className="block text-[11px] text-[var(--text-dim)]">Rango: <b className="text-[var(--accent)]">Novato</b></span>
              <span className="block text-sm font-extrabold">{points} <span className="text-[11px] font-bold text-[var(--text-dim)]">pts</span></span>
            </span>
          </Link>
          <button onClick={doSignOut}
            className="flex items-center justify-center gap-2 rounded-xl py-2 text-[13px] font-bold text-[var(--text-dim)] transition hover:bg-[var(--soft)] hover:text-[var(--accent-deep)]">
            <Icon name="logout" className="h-[18px] w-[18px]" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" className="h-8 w-8" />
            <span className="text-sm font-extrabold tracking-tight">LA PORRA <span className="text-[var(--text-dim)]">DE SANTIAGO</span></span>
          </Link>
          <button onClick={doSignOut} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-[var(--text-dim)] active:bg-[var(--soft)]">
            <Icon name="logout" className="h-4 w-4" /> Salir
          </button>
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
              <Icon name={n.icon} className="h-[22px] w-[22px]" />{n.label}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${MORE.some((m) => active(pathname, m.href)) ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>
          <Icon name="menu" className="h-[22px] w-[22px]" />Más
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-8 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.3)]"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--border)]" />
            <div className="grid grid-cols-1 gap-1">
              {MORE.map((n) => {
                const on = active(pathname, n.href);
                return (
                  <Link key={n.href} href={n.href} onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${on ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "text-[var(--text)] active:bg-[var(--soft)]"}`}>
                    <Icon name={n.icon} className="h-5 w-5" />{n.label}
                  </Link>
                );
              })}
              <button onClick={doSignOut}
                className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-[var(--text-dim)] active:bg-[var(--soft)]">
                <Icon name="logout" className="h-5 w-5" />Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Popup de bienvenida (una vez por usuario) ---------- */
function Onboarding({ onClose }: { onClose: () => void }) {
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
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-base font-bold text-white transition hover:bg-[var(--accent-deep)]">¡Vamos! 🚀</button>
      </div>
    </div>
  );
}

/* ---------- Aviso de Bizum (no bloquea: puede jugar pero insiste) ---------- */
function PaymentReminder({ open, userId, onClose, onPaid }: { open: boolean; userId: string | null; onClose: () => void; onPaid: () => void }) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const check = async () => {
    if (!userId) return;
    setPending(true); setError(null);
    try {
      const { data, error } = await createClient().from("profiles").select("has_paid").eq("id", userId).single();
      if (error) { setError(error.message); setPending(false); return; }
      if (data?.has_paid) { onPaid(); }
      else { setError("Aún no nos consta tu pago. En cuanto el organizador lo confirme, desaparecerá este aviso. 👍"); setPending(false); }
    } catch { setError("No se pudo comprobar, inténtalo de nuevo"); setPending(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(BIZUM.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 text-center shadow-2xl sm:m-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="" className="mx-auto h-20 w-[74px]" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">Te falta el Bizum</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">
          Puedes ir poniendo tus pronósticos, pero para entrar en la porra haz un <b className="text-[var(--text)]">Bizum</b> a este número. El organizador lo confirmará.
        </p>
        <button onClick={copy} className="mt-5 w-full rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-5">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--accent-deep)]">Bizum a</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">{BIZUM}</div>
          <div className="mt-1 text-[11px] font-bold text-[var(--text-dim)]">{copied ? "¡Copiado! ✓" : "Toca para copiar"}</div>
        </button>
        <button onClick={check} disabled={pending}
          className="mt-5 w-full rounded-xl bg-[var(--accent)] py-3.5 text-base font-extrabold text-white transition active:scale-95 disabled:opacity-50">
          {pending ? "Comprobando…" : "Ya he pagado · Comprobar"}
        </button>
        {error && <p className="mt-2 text-xs font-bold text-[var(--accent-deep)]">{error}</p>}
        <p className="mt-4 text-[11px] text-[var(--text-dim)]">
          El organizador confirma los pagos manualmente. En cuanto lo haga, este aviso desaparece. 😉
        </p>
        <button onClick={onClose} className="mt-5 text-[13px] font-bold text-[var(--text-dim)] underline-offset-2 hover:underline">
          Seguir jugando por ahora
        </button>
      </div>
    </div>
  );
}
