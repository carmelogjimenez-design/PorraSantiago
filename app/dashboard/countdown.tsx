"use client";
import { useEffect, useState } from "react";

type C = { d: number; h: number; m: number; s: number };
function diff(target: string): C | null {
  const t = new Date(target).getTime() - Date.now();
  if (!isFinite(t) || t <= 0) return null;
  const s = Math.floor(t / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ target }: { target: string }) {
  const [mounted, setMounted] = useState(false);
  const [c, setC] = useState<C | null>(null);
  useEffect(() => {
    setMounted(true);
    setC(diff(target));
    const id = setInterval(() => setC(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (mounted && c === null) {
    return (
      <div className="dfx-clock">
        <div className="dfx-live"><span className="dfx-live-dot" /> EN JUEGO</div>
      </div>
    );
  }
  const v = c ?? { d: 0, h: 0, m: 0, s: 0 };
  const cells: [number, string][] = [[v.d, "DÍAS"], [v.h, "HORAS"], [v.m, "MIN"], [v.s, "SEG"]];
  return (
    <div className="dfx-clock">
      {cells.map(([n, l]) => (
        <div key={l} className="dfx-cl"><div className="dfx-n">{pad(n)}</div><div className="dfx-l">{l}</div></div>
      ))}
    </div>
  );
}
