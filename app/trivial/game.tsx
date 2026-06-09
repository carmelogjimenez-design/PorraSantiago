"use client";

import { useEffect, useMemo, useState } from "react";
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

// Estilos de animación (inyectados una vez)
function FxStyles() {
  return (
    <style>{`
      @keyframes fxfall { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(110vh) rotate(540deg);opacity:0} }
      @keyframes fxshake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      @keyframes fxpop { 0%{transform:scale(.82);opacity:0} 55%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
      @keyframes fxplus { 0%{transform:translateY(0);opacity:0} 25%{opacity:1} 100%{transform:translateY(-30px);opacity:0} }
      @keyframes fxflip { 0%{transform:perspective(600px) rotateY(90deg) scale(.9);opacity:0} 100%{transform:perspective(600px) rotateY(0) scale(1);opacity:1} }
      @keyframes fxpulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.14)} }
    `}</style>
  );
}

// Lluvia de confeti
function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; delay: number; bg: string; rot: number; dur: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    const colors = ["var(--accent)", "#ffd24d", "#3ddc84", "#5b8cff", "#ff8fab"];
    const arr = Array.from({ length: 28 }, (_, i) => ({
      id: fire * 100 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      bg: colors[i % colors.length],
      rot: Math.random() * 360,
      dur: 0.9 + Math.random() * 0.7,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 2000);
    return () => clearTimeout(t);
  }, [fire]);
  if (pieces.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-12px] h-2.5 w-2.5 rounded-[2px]"
          style={{ left: `${p.left}%`, background: p.bg, transform: `rotate(${p.rot}deg)`, animation: `fxfall ${p.dur}s ${p.delay}s ease-in forwards` }}
        />
      ))}
    </div>
  );
}

export default function TriviaGame({ myId, myName, myTotal, ranking }: { myId: string; myName: string; myTotal: number; ranking: RankRow[] }) {
  const [screen, setScreen] = useState<"home" | "play" | "result">("home");
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [total, setTotal] = useState(myTotal);
  const [prevLevel, setPrevLevel] = useState(levelFor(myTotal));
  const [saving, setSaving] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

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

  // Confeti al entrar en resultado con subida de nivel
  useEffect(() => {
    if (screen === "result" && levelFor(total) > prevLevel) setConfettiKey((k) => k + 1);
  }, [screen, total, prevLevel]);

  const start = () => {
    setDeck(shuffle(QUESTIONS).slice(0, ROUND));
    setIdx(0); setPicked(null); setRoundCorrect(0); setTaunt(null);
    setStreak(0); setBestStreak(0);
    setPrevLevel(levelFor(total));
    setScreen("play");
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === deck[idx].answer;
    if (ok) {
      setRoundCorrect((c) => c + 1);
      const ns = streak + 1;
      setStreak(ns);
      setBestStreak((b) => Math.max(b, ns));
      setConfettiKey((k) => k + 1);
    } else {
      setStreak(0);
    }
    if (Math.random() < 0.33) setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
    else setTaunt(null);
  };

  const nextQ = async () => {
    if (idx + 1 < deck.length) {
      setIdx(idx + 1); setPicked(null); setTaunt(null);
      return;
    }
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

  const circ = 2 * Math.PI * 34;

  return (
    <>
      <FxStyles />
      <Confetti fire={confettiKey} />

      {/* ---------------- HOME ---------------- */}
      {screen === "home" && (
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Trivial del Mundial 🧠</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">Preguntas frikis de Mundiales. Cada acierto suma. ¡A por el trono!</p>

          {/* Héroe: anillo de XP */}
          <div className="card mt-5 p-5">
            <div className="flex items-center gap-4">
              <div className="relative grid flex-none place-items-center" style={{ width: 84, height: 84 }}>
                <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
                  <circle cx="42" cy="42" r="34" fill="none" stroke="var(--soft)" strokeWidth="7" />
                  <circle cx="42" cy="42" r="34" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - spanPct / 100)} style={{ transition: "stroke-dashoffset .9s ease" }} />
                </svg>
                <span className="absolute text-3xl">{level.emoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Tu nivel</div>
                <div className="font-[family-name:var(--font-display)] text-xl font-extrabold">{level.name}</div>
                <div className="mt-0.5 text-[11px] font-bold text-[var(--text-dim)]">
                  {next ? <>Te faltan <span className="text-[var(--accent)]">{toNext}</span> pts para <b>{next.name}</b> {next.emoji}</> : <>¡Nivel máximo! 🥇</>}
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--accent)]">{total}</div>
                <div className="text-[11px] font-bold text-[var(--text-dim)]">puntos</div>
              </div>
            </div>
          </div>

          {/* Escalera de niveles (cromos) */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]"><span>🏅</span> Escalera de niveles</div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-2" style={{ scrollbarWidth: "none" }}>
              {LEVELS.map((L, i) => {
                const unlocked = i <= lvl;
                const current = i === lvl;
                return (
                  <div key={i} className={`relative flex min-h-[104px] w-[92px] flex-none flex-col items-center rounded-2xl border-[1.5px] p-2 text-center ${current ? "border-[var(--accent)] bg-[var(--accent-soft)]" : unlocked ? "border-[var(--border)] bg-white" : "border-[var(--border)] bg-[var(--soft)]"}`}>
                    <div className={`text-2xl ${unlocked ? "" : "opacity-30 grayscale"}`}>{L.emoji}</div>
                    <div className={`mt-1 w-full break-words text-[10px] font-extrabold leading-tight ${unlocked ? "text-[var(--text)]" : "text-[var(--text-dim)]"}`}>{L.name}</div>
                    <div className="mt-auto pt-1 text-[9px] font-bold text-[var(--text-dim)]">{L.min} pts</div>
                    {!unlocked && <div className="absolute right-1.5 top-1.5 text-xs">🔒</div>}
                    {current && <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-extrabold leading-none text-white">Tú</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={start} className="mt-5 w-full rounded-2xl bg-[var(--accent)] py-4 text-base font-extrabold text-white transition active:scale-95">
            ▶️ Jugar ronda ({ROUND} preguntas)
          </button>

          {/* Ranking */}
          <div className="mt-7 flex items-center gap-2">
            <span className="text-lg">👑</span>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Rey del trivial</h2>
          </div>

          {board.length === 0 ? (
            <div className="card mt-2.5"><p className="py-5 text-center text-sm text-[var(--text-dim)]">Nadie ha jugado todavía. ¡Sé el primero! 😎</p></div>
          ) : (
            <>
              {/* Podio */}
              <div className="mt-4 flex items-end justify-center gap-2.5">
                {(board.slice(0, 3).length === 3 ? [1, 0, 2] : board.slice(0, 3).map((_, i) => i)).map((pos) => {
                  const r = board[pos];
                  if (!r) return null;
                  const mine = r.user_id === myId;
                  const h = pos === 0 ? 76 : pos === 1 ? 56 : 42;
                  const medal = pos === 0 ? "🥇" : pos === 1 ? "🥈" : "🥉";
                  const pedBg = mine ? "var(--accent-soft)" : pos === 0 ? "var(--amber-soft)" : "var(--soft)";
                  return (
                    <div key={r.user_id} className="flex w-1/3 max-w-[128px] flex-col items-center justify-end">
                      {pos === 0 && <div className="text-2xl leading-none">👑</div>}
                      <div className={`grid h-12 w-12 place-items-center rounded-full text-base font-extrabold ${mine ? "bg-[var(--accent)] text-white" : "bg-[var(--soft)] text-[var(--text)]"}`}>{(r.display_name || "?").charAt(0).toUpperCase()}</div>
                      <div className="mt-1.5 max-w-full truncate text-[12px] font-extrabold leading-tight">{mine ? "Tú" : r.display_name}</div>
                      <div className="text-[11px] font-bold text-[var(--text-dim)]">{r.points} pts</div>
                      <div className="mt-1.5 grid w-full place-items-center rounded-t-xl text-xl" style={{ height: h, background: pedBg }}>{medal}</div>
                    </div>
                  );
                })}
              </div>

              {/* Del 4º en adelante */}
              {board.length > 3 && (
                <div className="card mt-3 overflow-hidden p-0">
                  {board.slice(3).map((r, i) => (
                    <div key={r.user_id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""} ${r.user_id === myId ? "bg-[var(--accent-soft)]" : ""}`}>
                      <span className="w-6 text-center font-[family-name:var(--font-display)] font-extrabold text-[var(--text-dim)]">{i + 4}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.display_name}{r.user_id === myId ? " (tú)" : ""}</span>
                      <span className="flex-none font-[family-name:var(--font-display)] text-sm font-extrabold">{r.points}<span className="ml-0.5 text-[10px] font-bold text-[var(--text-dim)]">pts</span></span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------------- PLAY ---------------- */}
      {screen === "play" && (() => {
        const qq = deck[idx];
        const answered = picked !== null;
        const correctPick = answered && picked === qq.answer;
        return (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Pregunta {idx + 1}/{deck.length}</span>
              {streak >= 2 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3e0] px-2.5 py-1 text-[12px] font-extrabold text-[#b45309]" style={{ animation: "fxpulse .5s ease" }}>🔥 Racha x{streak}</span>
              ) : (
                <span className="text-[12px] font-bold text-[var(--text-dim)]">Aciertos: <b className="text-[var(--accent)]">{roundCorrect}</b></span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--soft)]">
              <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${(idx / deck.length) * 100}%` }} />
            </div>

            <div className="card relative mt-4 p-5">
              {correctPick && <span className="pointer-events-none absolute right-5 top-3 text-lg font-extrabold text-[var(--green)]" style={{ animation: "fxplus 1s ease forwards" }}>+10</span>}
              <p className="font-[family-name:var(--font-display)] text-lg font-extrabold leading-snug">{qq.q}</p>
              <div className="mt-4 grid gap-2">
                {qq.options.map((opt, i) => {
                  const isAns = i === qq.answer;
                  const chosen = picked === i;
                  let cls = "border-[var(--border)] bg-white hover:border-[var(--accent)]";
                  let anim: string | undefined;
                  if (answered) {
                    if (isAns) { cls = "border-[var(--green)] bg-[var(--green-soft)]"; anim = "fxpop .35s ease"; }
                    else if (chosen) { cls = "border-[var(--accent)] bg-[var(--accent-soft)]"; anim = "fxshake .4s ease"; }
                    else cls = "border-[var(--border)] bg-white opacity-50";
                  }
                  return (
                    <button key={i} onClick={() => choose(i)} disabled={answered} style={anim ? { animation: anim } : undefined}
                      className={`flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left text-sm font-bold transition ${cls}`}>
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-[var(--soft)] text-[11px] font-extrabold text-[var(--text-dim)]">{"ABCD"[i]}</span>
                      <span className="min-w-0 flex-1">{opt}</span>
                      {answered && isAns && <span className="flex-none text-[var(--green)]">✓</span>}
                      {answered && chosen && !isAns && <span className="flex-none text-[var(--accent)]">✗</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {taunt && <div className="mt-3 rounded-xl bg-[var(--text)] px-4 py-3 text-center text-[13px] font-extrabold text-white" style={{ animation: "fxpop .3s ease" }}>{taunt}</div>}

            {answered && (
              <button onClick={nextQ} className="mt-4 w-full rounded-2xl bg-[var(--accent)] py-3.5 text-base font-extrabold text-white transition active:scale-95">
                {idx + 1 < deck.length ? "Siguiente →" : "Ver resultado"}
              </button>
            )}
          </div>
        );
      })()}

      {/* ---------------- RESULT ---------------- */}
      {screen === "result" && (() => {
        const gained = roundCorrect * PER_HIT;
        const curLvl = levelFor(total);
        const leveledUp = curLvl > prevLevel;
        const acc = Math.round((roundCorrect / Math.max(1, deck.length)) * 100);
        return (
          <div className="mx-auto max-w-md text-center">
            <div className="text-5xl" style={{ animation: "fxpop .4s ease" }}>{leveledUp ? "🎉" : roundCorrect >= deck.length / 2 ? "💪" : "🙈"}</div>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{roundCorrect}/{deck.length}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">Has sumado <b className="text-[var(--accent)]">+{gained} puntos</b>{saving ? " · guardando…" : ""}</p>

            <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2">
              <div className="rounded-xl bg-[var(--soft)] p-2.5"><div className="font-[family-name:var(--font-display)] text-lg font-extrabold">{acc}%</div><div className="text-[10px] font-bold text-[var(--text-dim)]">acierto</div></div>
              <div className="rounded-xl bg-[var(--soft)] p-2.5"><div className="font-[family-name:var(--font-display)] text-lg font-extrabold">🔥 {bestStreak}</div><div className="text-[10px] font-bold text-[var(--text-dim)]">mejor racha</div></div>
              <div className="rounded-xl bg-[var(--soft)] p-2.5"><div className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--accent)]">{total}</div><div className="text-[10px] font-bold text-[var(--text-dim)]">total</div></div>
            </div>

            {leveledUp && (
              <div className="card mx-auto mt-5 max-w-[220px] overflow-hidden border-[1.5px] border-[var(--accent)] p-0" style={{ animation: "fxflip .6s ease" }}>
                <div className="bg-[var(--accent)] py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">¡Nivel desbloqueado!</div>
                <div className="p-4">
                  <div className="text-5xl" style={{ animation: "fxpulse 1s ease" }}>{LEVELS[curLvl].emoji}</div>
                  <div className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold">{LEVELS[curLvl].name}</div>
                </div>
              </div>
            )}

            <button onClick={start} className="mt-5 w-full rounded-2xl bg-[var(--accent)] py-4 text-base font-extrabold text-white transition active:scale-95">🔁 Otra ronda</button>
            <button onClick={() => setScreen("home")} className="mt-3 text-[13px] font-bold text-[var(--text-dim)] underline-offset-2 hover:underline">Volver al inicio</button>
          </div>
        );
      })()}
    </>
  );
}
