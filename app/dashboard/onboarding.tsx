"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    icon: "⚽",
    title: "Pronostica el resultado",
    text: "Pon el marcador exacto de cada partido (ej. 2-1). Aciertas el resultado = 3 puntos. Aciertas solo el ganador o el empate = 1 punto.",
  },
  {
    icon: "🔒",
    title: "Edita hasta el pitido inicial",
    text: "Puedes cambiar tu pronóstico todas las veces que quieras. Al empezar el partido se bloquea automáticamente.",
  },
  {
    icon: "🏆",
    title: "Sube en el ranking",
    text: "Cada acierto suma. Compite con el resto y demuestra quién sabe más de fútbol.",
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("porra_onboarded")) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  const close = () => {
    try {
      localStorage.setItem("porra_onboarded", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
          Bienvenido
        </div>
        <h2 className="font-[var(--font-display)] text-2xl font-extrabold tracking-tight">
          La Porra de Santiago
        </h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Así funciona, en 3 pasos:
        </p>

        <div className="mt-5 space-y-4">
          {STEPS.map((s) => (
            <div key={s.title} className="flex gap-3">
              <span className="text-2xl leading-none">{s.icon}</span>
              <div>
                <div className="text-sm font-bold">{s.title}</div>
                <div className="text-sm text-[var(--text-dim)]">{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={close}
          className="mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-base font-bold text-white transition hover:bg-[var(--accent-deep)]"
        >
          ¡Vamos! 🚀
        </button>
      </div>
    </div>
  );
}
