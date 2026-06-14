"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export default function KnockoutCountdown({ target, whenLabel }: { target: string | null; whenLabel: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!target) {
    return (
      <div className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--text-dim)]">
        Fecha por confirmar
      </div>
    );
  }

  const ms = new Date(target).getTime() - now;
  if (mounted && ms <= 0) {
    return (
      <div className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--accent)]">
        ¡Ya está aquí! 🔥
      </div>
    );
  }

  const s = mounted ? Math.max(0, Math.floor(ms / 1000)) : 0;
  const cells: [number, string][] = [
    [Math.floor(s / 86400), "DÍAS"],
    [Math.floor((s % 86400) / 3600), "HORAS"],
    [Math.floor((s % 3600) / 60), "MIN"],
    [s % 60, "SEG"],
  ];

  return (
    <div className="mt-3">
      <div className="flex justify-center gap-2 sm:gap-3">
        {cells.map(([n, l]) => (
          <div key={l} className="min-w-[68px] rounded-2xl border border-[var(--border)] bg-white px-3 py-3 text-center shadow-sm sm:min-w-[78px]">
            <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums sm:text-4xl">{pad(n)}</div>
            <div className="mt-1 text-[10px] font-extrabold tracking-[0.16em] text-[var(--accent)]">{l}</div>
          </div>
        ))}
      </div>
      {whenLabel && <div className="mt-3 text-[13px] font-semibold text-[var(--text-dim)]">Primer partido: {whenLabel}</div>}
    </div>
  );
}
