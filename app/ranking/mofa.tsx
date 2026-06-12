"use client";

import { useState } from "react";

type Player = { name: string; points: number; rank: number };

const FOOTER = "\n\n👉 https://porra-santiago.vercel.app";

const TEMPLATES: ((p: Player) => string)[] = [
  (p) => `Eh ${p.name} 👋 Vas ${p.rank}º con ${p.points} pts en La Porra de Santiago… un sitio calentito para ver cómo gano yo. 😎`,
  (p) => `${p.name}, ${p.points} pts. Mi abuela acierta más marcadores dormida en el sofá. A espabilar, fiera. 🐢`,
  (p) => `Aviso a la porra: ${p.name} (${p.rank}º) sigue convencido de que remonta. Qué tierno. 🤡`,
  (p) => `Con esos ${p.points} pts, ${p.name}, no ganas ni la porra del bingo del pueblo. Pero tranqui, lo importante es participar. 🫶`,
  (p) => `Spoiler para ${p.name}: el bote NO es para ti. Vas ${p.rank}º y de bajada. 💸😂`,
  (p) => `${p.name} fichó a sus goleadores con los ojos cerrados y se nota: ${p.rank}º. Un crack. ⚽🙈`,
  (p) => `${p.name}, tus pronósticos los firma el VAR… y los anula. ${p.rank}º con ${p.points} pts. 😂`,
];

export default function RankingMofa({ players, meName, mePoints }: { players: Player[]; meName: string; mePoints: number }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Player | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const build = (p: Player) => {
    const pool = [...TEMPLATES];
    if (mePoints - p.points > 0) {
      pool.push((q) => `${q.name}, te saco ${mePoints - q.points} pts de ventaja (${meName} manda). Llóralo en el grupo. 😈`);
    }
    const line = pool[Math.floor(Math.random() * pool.length)](p);
    return line + FOOTER;
  };

  const choose = (p: Player) => { setSel(p); setText(build(p)); setCopied(false); };
  const reroll = () => { if (sel) { setText(build(sel)); setCopied(false); } };

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* nada */ }
  };
  const whatsapp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank"); };

  const close = () => { setOpen(false); setSel(null); setText(""); setCopied(false); };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--text)] px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.99]">
        😈 Mandar un zasca a alguien
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <style dangerouslySetInnerHTML={{ __html: "@keyframes mofaPop{0%{transform:scale(.9) translateY(12px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}" }} />
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
          <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-[var(--border)] bg-white shadow-2xl"
            style={{ animation: "mofaPop .32s cubic-bezier(.2,.9,.3,1.3)" }}>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <div className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Mandar un zasca 😈</div>
              <button onClick={close} className="grid h-8 w-8 place-items-center rounded-full bg-[var(--soft)] text-[var(--text-dim)]">✕</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!sel ? (
                <>
                  <p className="mb-3 text-[13px] font-semibold text-[var(--text-dim)]">Elige a tu víctima 🎯</p>
                  <div className="space-y-2">
                    {players.map((p) => (
                      <button key={p.name + p.rank} onClick={() => choose(p)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-3 text-left transition hover:border-[var(--accent)] active:scale-[0.99]">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[var(--soft)] text-xs font-extrabold text-[var(--text-dim)]">{p.rank}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
                        <span className="flex-none text-[12px] font-extrabold text-[var(--text-dim)]">{p.points} pts</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <button onClick={() => { setSel(null); setText(""); }} className="text-[13px] font-bold text-[var(--accent-deep)]">← Cambiar</button>
                    <span className="text-[13px] font-semibold text-[var(--text-dim)]">Para <b className="text-[var(--text)]">{sel.name}</b> ({sel.rank}º · {sel.points} pts)</span>
                  </div>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
                    className="w-full resize-none rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--soft)] p-3 text-sm font-medium leading-relaxed outline-none focus:border-[var(--accent)]" />
                  <button onClick={reroll}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--accent-deep)] active:scale-95">
                    🎲 Otra frase
                  </button>
                </>
              )}
            </div>

            {sel && (
              <div className="flex gap-2 border-t border-[var(--border)] p-4">
                <button onClick={copy}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-extrabold text-[var(--text)] transition active:scale-95">
                  {copied ? "¡Copiado! ✓" : "Copiar"}
                </button>
                <button onClick={whatsapp}
                  className="flex-1 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white transition active:scale-95">
                  WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
