"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "../components/avatar";

type Rank = { display_name: string; avatar_url: string | null; best: number };
const SHOTS = 5;
const POS = ["#f5b301", "#c0c5cd", "#d59a5f"];

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
          <div className="relative grid grid-cols-3 grid-rows-2 gap-2" style={{ aspectRatio: "3 / 2" }}>
            {Array.from({ length: 6 }).map((_, z) => (
              <button key={z} onClick={() => shoot(z)} disabled={animating || phase === "over"}
                className="relative grid place-items-center rounded-xl border border-dashed border-[var(--border)] bg-white/40 text-3xl transition active:scale-95 disabled:cursor-default hover:bg-white/70">
                {ballZone === z && <span className="pop">⚽</span>}
                {keeperZone === z && <span className="pop absolute text-4xl">🧤</span>}
              </button>
            ))}
          </div>

          {flash && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className={`pop font-[family-name:var(--font-display)] text-4xl font-extrabold drop-shadow ${flash === "goal" ? "text-[var(--green)]" : "text-[var(--accent)]"}`}>
                {flash === "goal" ? "¡GOOOL!" : "¡PARADA!"}
              </span>
            </div>
          )}

          {/* Portero "en reposo" cuando no hay animación y se está jugando */}
          {!animating && phase === "play" && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-4xl opacity-90">🧤</div>
          )}
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
