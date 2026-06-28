"use client";

import { useState } from "react";

type Row = { user_id: string; display_name: string; picks_done: number };
const BRACKET_TOTAL = 31; // 16avos(16) + octavos(8) + cuartos(4) + semis(2) + final(1)

export default function BracketCompletionList({ rows }: { rows: Row[] }) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  const isComplete = (r: Row) => r.picks_done >= BRACKET_TOTAL;

  const complete = rows.filter(isComplete).length;
  const missing = rows.filter((r) => !isComplete(r));
  const shown = onlyMissing ? missing : rows;

  const copyReminder = async () => {
    const names = missing.map((r) => r.display_name).join(", ");
    const text = missing.length
      ? `⚡ Recordatorio · Cuadro de la fase final ⚡\nAún os falta rellenar el cuadro entero (hasta la final): ${names}.\n👉 https://porra-santiago.vercel.app/fase-final`
      : `✅ ¡Todos tenéis el cuadro completo! Que empiece la eliminatoria. 🏆`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* nada */ }
  };

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold">
          <span className="text-[var(--green)]">{complete}</span>
          <span className="text-[var(--text-dim)]"> de {rows.length} lo tienen todo</span>
          {missing.length > 0 && <span className="text-[var(--text-dim)]"> · faltan {missing.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOnlyMissing((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${onlyMissing ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--soft)]"}`}>
            Solo los que faltan
          </button>
          <button onClick={copyReminder}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-[var(--accent-deep)] active:scale-95">
            {copied ? "¡Copiado! ✓" : "📲 Copiar aviso"}
          </button>
        </div>
      </div>

      <div className="card mt-4 p-2 sm:p-3">
        {shown.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-dim)]">
            {onlyMissing ? "¡Nadie tiene nada pendiente! 🎉" : "Aún no hay jugadores."}
          </p>
        ) : (
          shown.map((r, i) => {
            const done = isComplete(r);
            return (
              <div key={r.user_id} className={`flex items-center gap-3 px-2 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                <span className={`grid h-7 w-7 flex-none place-items-center rounded-full text-sm ${done ? "bg-[var(--green-soft)]" : "bg-[var(--accent-soft)]"}`}>
                  {done ? "✅" : "⚠️"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.display_name}</span>
                <span className="flex-none text-right text-[11px] font-semibold text-[var(--text-dim)]">
                  <span className={done ? "text-[var(--green)]" : "text-[var(--accent)]"}>Cuadro {r.picks_done}/{BRACKET_TOTAL}</span>
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-2 text-[11px] text-[var(--text-dim)]">Cuadro = los 31 cruces de la fase final (16avos · octavos · cuartos · semis · final)</p>
    </div>
  );
}
