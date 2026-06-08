"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { QUESTIONS, type Question } from "./questions";

export type RankRow = { user_id: string; display_name: string; points: number; answered: number; correct: number };

const ROUND = 8;          // preguntas por ronda
const PER_HIT = 10;       // puntos por acierto

const LEVELS = [
  { min: 0, name: "Calientabanquillos", emoji: "🪑" },
  { min: 50, name: "Suplente", emoji: "🧦" },
  { min: 150, name: "Titular", emoji: "👕" },
  { min: 300, name: "Capitán", emoji: "🎽" },
  { min: 500, name: "Crack del barrio", emoji: "⚽" },
  { min: 800, name: "Estrella mundial", emoji: "🌟" },
  { min: 1200, name: "Leyenda", emoji: "🏆" },
  { min: 2000, name: "Balón de Oro", emoji: "🥇" },
];

const TAUNTS = [
  "CABRÓN, QUE SÉ QUE HAS COPIADO LA PREGUNTA Y TE HAS IDO A VER LA RESPUESTA A GOOGLE 🤨",
  "¿Esa la sabías o ha sido suerte de pinball? 😏",
  "Eso lo sabe hasta mi abuela, no te vengas arriba 👵",
  "Has tardado lo tuyo… ¿lo consultabas con la almohada? 🛏️",
  "Bien ahí, fiera. O eso, o estás haciendo trampa 😂",
  "Te estoy vigilando, eh… 👀",
  "Ni un máster en Mundiales tienes tú, máquina 🎓",
  "Vale, vale, no presumas que aún queda ronda 🫵",
];

function levelFor(total: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i].min) idx = i;
  return idx;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TriviaGame({ myId, myName, myTotal, ranking }: { myId: string; myName: string; myTotal: number; ranking: RankRow[] }) {
  const [screen, setScreen] = useState<"home" | "play" | "result">("home");
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [total, setTotal] = useState(myTotal);
  const [prevLevel, setPrevLevel] = useState(levelFor(myTotal));
  const [saving, setSaving] = useState(false);

  const lvl = levelFor(total);
  const level = LEVELS[lvl];
  const next = LEVELS[lvl + 1];
  const toNext = next ? next.min - total : 0;
  const spanPct = next ? Math.min(100, Math.round(((total - level.min) / (next.min - level.min)) * 100)) : 100;

  const board = useMemo(() => {
    const rows = [...ranking];
    if (!rows.some((r) => r.user_id === myId) && total > 0) {
      rows.push({ user_id: myId, display_name: myName, points: total, answered: 0, correct: 0 });
    }
    return rows.sort((a, b) => b.points - a.points).slice(0, 10);
  }, [ranking, myId, myName, total]);

  const start = () => {
    setDeck(shuffle(QUESTIONS).slice(0, ROUND));
    setIdx(0); setPicked(null); setRoundCorrect(0); setTaunt(null);
    setPrevLevel(levelFor(total));
    setScreen("play");
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === deck[idx].answer;
    if (ok) setRoundCorrect((c) => c + 1);
    // mensaje canalla de vez en cuando
    if (Math.random() < 0.33) setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
    else setTaunt(null);
  };

  const nextQ = async () => {
    if (idx + 1 < deck.length) {
      setIdx(idx + 1); setPicked(null); setTaunt(null);
      return;
    }
    // fin de ronda
    const gained = roundCorrect * PER_HIT;
    const newTotal = total + gained;
    setTotal(newTotal);
    setScreen("result");
    setSaving(true);
    try {
      await createClient().rpc("add_trivia_result", { p_points: gained, p_answered: deck.length, p_correct: roundCorrect });
    } catch {}
    setSaving(false);
  };

  // -------- HOME --------
  if (screen === "home") {
    return (
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Trivial del Mundial 🧠</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">Preguntas frikis de Mundiales. Cada acierto suma. ¡A por el trono!</p>

        <div className="card mt-5 p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{level.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Tu nivel</div>
              <div className="font-[family-name:var(--font-display)] text-xl font-extrabold">{level.name}</div>
            </div>
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--accent)]">{total}</div>
              <div className="text-[11px] font-bold text-[var(--text-dim)]">puntos</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--soft)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700" style={{ width: `${spanPct}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] font-bold text-[var(--text-dim)]">
            {next ? <>Te faltan <span className="text-[var(--accent)]">{toNext}</span> pts para <b>{next.name}</b> {next.emoji}</> : <>¡Nivel máximo desbloqueado! 🥇</>}
          </div>
        </div>

        <button onClick={start} className="mt-5 w-full rounded-2xl bg-[var(--accent)] py-4 text-base font-extrabold text-white transition active:scale-95">
          ▶️ Jugar ronda ({ROUND} preguntas)
        </button>

        <div className="mt-7 flex items-center gap-2">
          <span className="text-lg">👑</span>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Rey del trivial</h2>
        </div>
        <div className="card mt-2.5 overflow-hidden p-0">
          {board.length === 0 ? (
            <p className="py-5 text-center text-sm text-[var(--text-dim)]">Nadie ha jugado todavía. ¡Sé el primero! 😎</p>
          ) : board.map((r, i) => (
            <div key={r.user_id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""} ${r.user_id === myId ? "bg-[var(--accent-soft)]" : ""}`}>
              <span className="w-6 text-center font-[family-name:var(--font-display)] font-extrabold text-[var(--text-dim)]">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.display_name}{r.user_id === myId ? " (tú)" : ""}</span>
              <span className="flex-none font-[family-name:var(--font-display)] text-sm font-extrabold">{r.points}<span className="ml-0.5 text-[10px] font-bold text-[var(--text-dim)]">pts</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------- PLAY --------
  if (screen === "play") {
    const qq = deck[idx];
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Pregunta {idx + 1}/{deck.length}</span>
          <span className="text-[12px] font-bold text-[var(--text-dim)]">Aciertos: <b className="text-[var(--accent)]">{roundCorrect}</b></span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--soft)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${((idx) / deck.length) * 100}%` }} />
        </div>

        <div className="card mt-4 p-5">
          <p className="font-[family-name:var(--font-display)] text-lg font-extrabold leading-snug">{qq.q}</p>
          <div className="mt-4 grid gap-2">
            {qq.options.map((opt, i) => {
              const isAns = i === qq.answer;
              const chosen = picked === i;
              let cls = "border-[var(--border)] bg-white hover:border-[var(--accent)]";
              if (picked !== null) {
                if (isAns) cls = "border-[var(--green)] bg-[var(--green-soft)]";
                else if (chosen) cls = "border-[var(--accent)] bg-[var(--accent-soft)]";
                else cls = "border-[var(--border)] bg-white opacity-60";
              }
              return (
                <button key={i} onClick={() => choose(i)} disabled={picked !== null}
                  className={`flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left text-sm font-bold transition ${cls}`}>
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-[var(--soft)] text-[11px] font-extrabold text-[var(--text-dim)]">{"ABCD"[i]}</span>
                  <span className="min-w-0 flex-1">{opt}</span>
                  {picked !== null && isAns && <span className="flex-none text-[var(--green)]">✓</span>}
                  {picked !== null && chosen && !isAns && <span className="flex-none text-[var(--accent)]">✗</span>}
                </button>
              );
            })}
          </div>
        </div>

        {taunt && (
          <div className="mt-3 rounded-xl bg-[var(--text)] px-4 py-3 text-center text-[13px] font-extrabold text-white">{taunt}</div>
        )}

        {picked !== null && (
          <button onClick={nextQ} className="mt-4 w-full rounded-2xl bg-[var(--accent)] py-3.5 text-base font-extrabold text-white transition active:scale-95">
            {idx + 1 < deck.length ? "Siguiente →" : "Ver resultado"}
          </button>
        )}
      </div>
    );
  }

  // -------- RESULT --------
  const gained = roundCorrect * PER_HIT;
  const leveledUp = levelFor(total) > prevLevel;
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="text-5xl">{leveledUp ? "🎉" : roundCorrect >= deck.length / 2 ? "💪" : "🙈"}</div>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{roundCorrect}/{deck.length}</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">Has sumado <b className="text-[var(--accent)]">+{gained} puntos</b>{saving ? " · guardando…" : ""}</p>

      {leveledUp && (
        <div className="card mt-5 p-5">
          <div className="text-3xl">{LEVELS[levelFor(total)].emoji}</div>
          <div className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">¡Nivel desbloqueado!</div>
          <div className="font-[family-name:var(--font-display)] text-xl font-extrabold">{LEVELS[levelFor(total)].name}</div>
        </div>
      )}

      <div className="card mt-5 p-4">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Tu total</div>
        <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--accent)]">{total}</div>
        <div className="text-[12px] font-bold text-[var(--text-dim)]">Nivel: {LEVELS[levelFor(total)].name} {LEVELS[levelFor(total)].emoji}</div>
      </div>

      <button onClick={start} className="mt-5 w-full rounded-2xl bg-[var(--accent)] py-4 text-base font-extrabold text-white transition active:scale-95">
        🔁 Otra ronda
      </button>
      <button onClick={() => setScreen("home")} className="mt-3 text-[13px] font-bold text-[var(--text-dim)] underline-offset-2 hover:underline">
        Volver al inicio
      </button>
    </div>
  );
}
