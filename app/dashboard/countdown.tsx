"use client";

import { useEffect, useState } from "react";

function diffParts(target: number) {
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
  const [p, setP] = useState(() => diffParts(t));

  useEffect(() => {
    const id = setInterval(() => setP(diffParts(t)), 1000);
    return () => clearInterval(id);
  }, [t]);

  if (p.started) {
    return (
      <div className="relative z-[2] mt-4 rounded-2xl bg-white/15 px-4 py-3 text-center text-sm font-bold">
        ¡El Mundial ya ha empezado! 🔥
      </div>
    );
  }

  const cells = [
    { v: p.d, l: "días" },
    { v: p.h, l: "horas" },
    { v: p.m, l: "min" },
    { v: p.s, l: "seg" },
  ];

  return (
    <div className="relative z-[2] mt-4 flex gap-2.5">
      {cells.map((c) => (
        <div
          key={c.l}
          className="flex-1 rounded-2xl bg-white/15 py-2.5 text-center"
        >
          <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-none">
            {pad(c.v)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/70">
            {c.l}
          </div>
        </div>
      ))}
    </div>
  );
}
