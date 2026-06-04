"use client";

import { useState } from "react";
import Icon from "../components/icons";

type Rival = { id: string; name: string; points: number };

export default function RankingTools({
  shareText, meName, mePoints, rivals,
}: { shareText: string; meName: string; mePoints: number; rivals: Rival[] }) {
  const [copied, setCopied] = useState(false);
  const [rivalId, setRivalId] = useState<string>("");

  const rival = rivals.find((r) => r.id === rivalId) || null;
  const diff = rival ? mePoints - rival.points : 0;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
    } catch { /* cae a copiar */ }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* nada */ }
  };

  let duelMsg = "";
  if (rival) {
    if (diff > 0) duelMsg = `Le sacas ${diff} ${diff === 1 ? "punto" : "puntos"} a ${rival.name}. 😎`;
    else if (diff < 0) duelMsg = `${rival.name} te saca ${-diff}. ¡A remontar! 🔥`;
    else duelMsg = `Empate a ${mePoints}. Esto se decide en el campo. 🤝`;
  }

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {/* Compartir */}
      <div className="card flex flex-col justify-between p-4">
        <div>
          <div className="text-[12px] font-extrabold uppercase tracking-[0.08em]">Pícale a la peña</div>
          <p className="mt-1 text-[13px] text-[var(--text-dim)]">Comparte la clasificación en el grupo y que tiemblen.</p>
        </div>
        <button onClick={share}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-extrabold text-white transition hover:bg-[var(--accent-deep)] active:scale-[0.98]">
          {copied ? "¡Copiado! ✓" : "📲 Compartir / Copiar"}
        </button>
      </div>

      {/* Duelo 1v1 */}
      <div className="card p-4">
        <div className="text-[12px] font-extrabold uppercase tracking-[0.08em]">⚔️ Tu duelo</div>
        <select
          value={rivalId}
          onChange={(e) => setRivalId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)]"
        >
          <option value="">Elige a tu rival…</option>
          {rivals.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        {rival && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--soft)] p-3">
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-[13px] font-bold">{meName}</div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold">{mePoints}</div>
              </div>
              <div className="px-1 text-xs font-extrabold text-[var(--text-dim)]">VS</div>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-[13px] font-bold">{rival.name}</div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold">{rival.points}</div>
              </div>
            </div>
            <p className={`mt-2 text-center text-[13px] font-bold ${diff >= 0 ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>
              {duelMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
