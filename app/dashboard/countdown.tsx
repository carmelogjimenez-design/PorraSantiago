"use client";
import { useEffect, useState } from "react";

type Team = { name: string; flag: string | null };
type Match = { home: Team; away: Team; kickoff: string };
type C = { d: number; h: number; m: number; s: number };

function diff(target: string): C | null {
  const t = new Date(target).getTime() - Date.now();
  if (!isFinite(t) || t <= 0) return null;
  const s = Math.floor(t / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const tz = "Europe/Madrid";
  const time = d.toLocaleTimeString("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const key = (x: Date) => x.toLocaleDateString("es-ES", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" });
  const now = new Date();
  const tom = new Date(now.getTime() + 86400000);
  if (key(d) === key(now)) return `Hoy ${time}`;
  if (key(d) === key(tom)) return `Mañana ${time}`;
  const dm = d.toLocaleDateString("es-ES", { timeZone: tz, day: "numeric", month: "short" });
  return `${dm} · ${time}`;
}

function CFlag({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="dfx-cflag dfx-cflag-empty" aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="dfx-cflag" src={src} alt={name} />;
}

export default function Countdown({ matches }: { matches: Match[] }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Antes de montar: usa el primero (determinista, evita mismatch). Después: el primero aún por jugar.
  const next = mounted ? matches.find((m) => new Date(m.kickoff).getTime() > now) : matches[0];

  if (!next) {
    return (
      <div className="dfx-next">
        <div className="dfx-live"><span className="dfx-live-dot" /> MUNDIAL EN JUEGO</div>
      </div>
    );
  }

  const c = mounted ? (diff(next.kickoff) ?? { d: 0, h: 0, m: 0, s: 0 }) : { d: 0, h: 0, m: 0, s: 0 };
  const cells: [number, string][] = [[c.d, "DÍAS"], [c.h, "HORAS"], [c.m, "MIN"], [c.s, "SEG"]];

  return (
    <div className="dfx-next">
      <div className="dfx-next-h">⚽ Próximo partido{mounted ? ` · ${fmtWhen(next.kickoff)}` : ""}</div>
      <div className="dfx-next-teams">
        <span className="dfx-ct"><CFlag src={next.home.flag} name={next.home.name} /><b>{next.home.name}</b></span>
        <span className="dfx-vs">VS</span>
        <span className="dfx-ct"><CFlag src={next.away.flag} name={next.away.name} /><b>{next.away.name}</b></span>
      </div>
      <div className="dfx-clock">
        {cells.map(([n, l]) => (
          <div key={l} className="dfx-cl"><div className="dfx-n">{pad(n)}</div><div className="dfx-l">{l}</div></div>
        ))}
      </div>
    </div>
  );
}
