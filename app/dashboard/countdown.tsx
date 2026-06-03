"use client";

import { useEffect, useState } from "react";

function parts(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
    started: ms === 0,
  };
}
const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ target }: { target: string }) {
  const t = new Date(target).getTime();
  const [p, setP] = useState(() => parts(t));
  useEffect(() => {
    const id = setInterval(() => setP(parts(t)), 1000);
    return () => clearInterval(id);
  }, [t]);

  if (p.started)
    return (
      <div className="mt-3 text-lg font-extrabold text-[var(--accent)]">
        ¡El Mundial ya ha empezado! 🔥
      </div>
    );

  const cells = [
    { v: p.d, l: "DÍAS" },
    { v: p.h, l: "HORAS" },
    { v: p.m, l: "MIN" },
    { v: p.s, l: "SEG" },
  ];
  return (
    <div className="mt-2 flex gap-6">
      {cells.map((c) => (
        <div key={c.l}>
          <div className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none text-[var(--accent)]">
            {pad(c.v)}
          </div>
          <div className="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-[var(--text-dim)]">
            {c.l}
          </div>
        </div>
      ))}
    </div>
  );
}
