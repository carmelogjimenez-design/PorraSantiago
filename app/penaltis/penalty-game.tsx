"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "../components/avatar";

type Rank = { display_name: string; avatar_url: string | null; best: number };
const SHOTS = 5;
const POS = ["#f5b301", "#c0c5cd", "#d59a5f"];
const ZONE_X = [18, 50, 82];
const ZONE_Y = [32, 68];

export default function PenaltyGame({ initialRanking, initialBest }: { initialRanking: Rank[]; initialBest: number }) {
  const [phase, setPhase] = useState<"play" | "over">("play");
  const [results, setResults] = useState<Array<"goal" | "save">>([]);
  const [animating, setAnimating] = useState(false);
  const [ballZone, setBallZone] = useState<number | null>(null);
  const [keeperZone, setKeeperZone] = useState<number | null>(null);
  const [flash, setFlash] = useState<"goal" | "save" | null>(null);
  const [best, setBest] = useState(initialBest);
  const [ranking, setRanking] = useState<Rank[]>(initialRanking);
  const [saving, setSaving] = useState(false);

  const goals = results.filter((r) => r === "goal").length;

  const shoot = (z: number) => {
    if (animating || phase === "over") return;
    const keeper = Math.floor(Math.random() * 6);
    const saved = keeper === z || Math.random() < 0.2; // ~33% parada
    const res: "goal" | "save" = saved ? "save" : "goal";

    setAnimating(true);
    setBallZone(z);
    setKeeperZone(keeper);
    setFlash(res);

    setTimeout(async () => {
      const newResults = [...results, res];
      setResults(newResults);
      setAnimating(false);
      setBallZone(null);
      setKeeperZone(null);
      setFlash(null);

      if (newResults.length >= SHOTS) {
        setPhase("over");
        const g = newResults.filter((r) => r === "goal").length;
        setSaving(true);
        try {
          const supabase = createClient();
          const { data } = await supabase.rpc("save_penalty_best", { p_score: g });
          if (typeof data === "number") setBest(data);
          const { data: rk } = await supabase.rpc("get_penalty_ranking");
          if (rk) setRanking(rk as Rank[]);
        } catch { /* sin red, no pasa nada */ }
        setSaving(false);
      }
    }, 850);
  };

  const reset = () => {
    setResults([]);
    setPhase("play");
    setFlash(null);
  };

  const gkX = animating && keeperZone != null ? ZONE_X[keeperZone % 3] : 50;
  const gkY = animating && keeperZone != null ? ZONE_Y[Math.floor(keeperZone / 3)] : 30;
  const tilt = animating && keeperZone != null ? (keeperZone % 3 === 0 ? -22 : keeperZone % 3 === 2 ? 22 : 0) : 0;

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
      <div>
        {/* Marcador de tiros */}
        <div className="mb-3 flex items-center justify-center gap-2">
          {Array.from({ length: SHOTS }).map((_, i) => {
            const r = results[i];
            return (
              <span key={i} className={`grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${
                r === "goal" ? "bg-[var(--green-soft)] text-[var(--green)]"
                : r === "save" ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "bg-[var(--soft)] text-[var(--text-dim)]"
              }`}>
                {r === "goal" ? "⚽" : r === "save" ? "✗" : i + 1}
              </span>
            );
          })}
        </div>

        {/* Portería */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-gradient-to-b from-[#eef2f6] to-[#e3e9f0] p-3">
          <div className="relative" style={{ aspectRatio: "3 / 2" }}>
            {/* zonas clicables */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2">
              {Array.from({ length: 6 }).map((_, z) => (
                <button key={z} onClick={() => shoot(z)} disabled={animating || phase === "over"}
                  className="rounded-xl border border-dashed border-[var(--border)] bg-white/40 transition active:scale-95 hover:bg-white/70 disabled:cursor-default" />
              ))}
            </div>

            {/* balón */}
            {ballZone != null && (
              <div className="pop pointer-events-none absolute text-3xl"
                style={{ left: `${ZONE_X[ballZone % 3]}%`, top: `${ZONE_Y[Math.floor(ballZone / 3)]}%`, transform: "translate(-50%,-50%)" }}>⚽</div>
            )}

            {/* portero que se mueve y se estira */}
            <div className="pointer-events-none absolute"
              style={{ left: `${gkX}%`, top: `${gkY}%`, transform: "translate(-50%,-50%)", transition: "left .45s cubic-bezier(.34,1.56,.64,1), top .45s cubic-bezier(.34,1.56,.64,1)" }}>
              <div className="relative" style={{ transition: "transform .45s", transform: animating ? `rotate(${tilt}deg) scale(1.15)` : "rotate(0deg) scale(1)", animation: !animating && phase === "play" ? "gkSway 1.4s ease-in-out infinite" : "none" }}>
                <svg width="62" height="80" viewBox="0 0 120 152" fill="none" aria-label="portero">
                  <path d="M44 64 L18 40" stroke="#f0b81f" strokeWidth="13" strokeLinecap="round" />
                  <path d="M76 64 L102 40" stroke="#f0b81f" strokeWidth="13" strokeLinecap="round" />
                  <path d="M44 62 L18 38" stroke="#ffd23f" strokeWidth="11" strokeLinecap="round" />
                  <path d="M76 62 L102 38" stroke="#ffd23f" strokeWidth="11" strokeLinecap="round" />
                  <path d="M10 30c5-4 13-4 16 2 2 4 1 9-3 12-2 5-8 6-12 3-5-3-7-9-4-14 1-1 2-2 3-3z" fill="#ff2d55" />
                  <path d="M22 32c3 2 4 6 2 10-1 3-4 5-7 5 4 1 9-1 11-5 2-5 0-10-6-10z" fill="#d61f45" />
                  <rect x="11" y="40" width="13" height="4" rx="2" fill="#ffffff" transform="rotate(-42 17 42)" />
                  <path d="M110 30c-5-4-13-4-16 2-2 4-1 9 3 12 2 5 8 6 12 3 5-3 7-9 4-14-1-1-2-2-3-3z" fill="#ff2d55" />
                  <path d="M98 32c-3 2-4 6-2 10 1 3 4 5 7 5-4 1-9-1-11-5-2-5 0-10 6-10z" fill="#d61f45" />
                  <rect x="96" y="40" width="13" height="4" rx="2" fill="#ffffff" transform="rotate(42 103 42)" />
                  <rect x="45" y="108" width="11" height="28" rx="4" fill="#ffd23f" />
                  <rect x="64" y="108" width="11" height="28" rx="4" fill="#ffd23f" />
                  <rect x="45" y="116" width="11" height="4" fill="#1f2937" />
                  <rect x="64" y="116" width="11" height="4" fill="#1f2937" />
                  <path d="M42 134h17v7a3 3 0 0 1-3 3H42z" fill="#15171c" />
                  <path d="M61 134h17v10H64a3 3 0 0 1-3-3z" fill="#15171c" />
                  <path d="M38 92h44l-4 20H42z" fill="#1f2937" />
                  <path d="M60 92h22l-4 20H60z" fill="#161d29" />
                  <path d="M36 60c0-8 10-12 24-12s24 4 24 12v34H36z" fill="#ffd23f" />
                  <path d="M60 48c0 0 24 4 24 12v34H60z" fill="#f0b81f" />
                  <path d="M51 50c2 5 5 8 9 8s7-3 9-8l-4-1c-1 3-3 4-5 4s-4-1-5-4z" fill="#1f2937" />
                  <path d="M58 68l6-2v22h-5V72l-3 1z" fill="#1f2937" />
                  <rect x="54" y="44" width="12" height="9" fill="#e3ad84" />
                  <ellipse cx="60" cy="30" rx="17" ry="18" fill="#f0c19a" />
                  <path d="M60 12a18 18 0 0 1 0 36c7-3 11-10 11-18s-4-15-11-18z" fill="#e3ad84" />
                  <ellipse cx="43" cy="32" rx="3" ry="4" fill="#f0c19a" />
                  <ellipse cx="77" cy="32" rx="3" ry="4" fill="#e3ad84" />
                  <path d="M42 28c-1-13 8-21 18-21s19 8 18 21c-2-5-5-8-5-8-3 3-7 4-13 4s-10-1-13-4c0 0-3 3-5 8z" fill="#2c2620" />
                  <path d="M50 24l6 2M70 24l-6 2" stroke="#2c2620" strokeWidth="2" strokeLinecap="round" />
                  <ellipse cx="53" cy="31" rx="2" ry="2.6" fill="#2c2620" />
                  <ellipse cx="67" cy="31" rx="2" ry="2.6" fill="#2c2620" />
                  <path d="M55 40q5 3 10 0" stroke="#b5785a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </svg>
                <img src="/portero.png" alt="portero" draggable={false}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  className="pointer-events-none select-none"
                  style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "82px", height: "auto" }} />
              </div>
            </div>
          </div>

          {flash && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className={`pop font-[family-name:var(--font-display)] text-4xl font-extrabold drop-shadow ${flash === "goal" ? "text-[var(--green)]" : "text-[var(--accent)]"}`}>
                {flash === "goal" ? "¡GOOOL!" : "¡PARADA!"}
              </span>
            </div>
          )}

          <style>{`@keyframes gkSway{0%,100%{transform:translateX(-7px)}50%{transform:translateX(7px)}}`}</style>
        </div>

        {phase === "play" ? (
          <p className="mt-3 text-center text-sm font-semibold text-[var(--text-dim)]">
            Toca una esquina para tirar. Te quedan <b className="text-[var(--text)]">{SHOTS - results.length}</b> penaltis. ⚽
          </p>
        ) : (
          <div className="mt-3 rounded-2xl bg-[var(--soft)] p-4 text-center">
            <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Has marcado {goals}/{SHOTS}</div>
            <div className="mt-1 text-[13px] font-semibold text-[var(--text-dim)]">
              {saving ? "Guardando tu marca…" : `Tu récord: ${best} ${best === 1 ? "gol" : "goles"} ${goals >= best && goals > 0 ? "🔥 ¡nuevo récord!" : ""}`}
            </div>
            <button onClick={reset}
              className="mt-3 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[var(--accent-deep)] active:scale-95">
              Otra vez ⚽
            </button>
          </div>
        )}
      </div>

      {/* Ranking de penaltis */}
      <div className="card h-fit p-4">
        <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em]">🏅 Rey de los penaltis</div>
        {ranking.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-[var(--text-dim)]">Nadie ha marcado todavía. ¡Sé el primero! 🥅</p>
        ) : (
          ranking.slice(0, 12).map((r, i) => (
            <div key={i} className={`flex items-center gap-2.5 py-1.5 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-extrabold text-white"
                style={{ background: i < 3 ? POS[i] : "var(--text-dim)" }}>{i + 1}</span>
              <Avatar src={r.avatar_url} name={r.display_name} className="h-7 w-7" textClass="text-[11px]" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{r.display_name}</span>
              <span className="text-[13px] font-extrabold text-[var(--accent)]">{r.best}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
