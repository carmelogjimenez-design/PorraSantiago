"use client";

import { useMemo, useState } from "react";

export type MatchVM = {
  id: string; group: string; kickoffAt: string; status: string;
  homeScore: number | null; awayScore: number | null;
  homeName: string; homeFlag: string | null; awayName: string; awayFlag: string | null;
};
export type PredVM = { name: string; ph: number; pa: number };

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-4 w-6 flex-none rounded-sm object-cover" />;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PredictionsBoard({ matches, predsByMatch, isAdmin }: { matches: MatchVM[]; predsByMatch: Record<string, PredVM[]>; isAdmin: boolean }) {
  const withPreds = useMemo(() => matches.filter((m) => (predsByMatch[m.id]?.length ?? 0) > 0), [matches, predsByMatch]);
  const [selected, setSelected] = useState<string>(withPreds[0]?.id ?? "");
  const [copiedWA, setCopiedWA] = useState(false);

  const match = withPreds.find((m) => m.id === selected) ?? withPreds[0];
  const rows = match ? (predsByMatch[match.id] ?? []) : [];
  const finished = match?.status === "finished" && match.homeScore != null && match.awayScore != null;

  const topScore = useMemo(() => {
    if (rows.length === 0) return null;
    const count = new Map<string, number>();
    for (const r of rows) { const k = `${r.ph}-${r.pa}`; count.set(k, (count.get(k) ?? 0) + 1); }
    let best = ""; let n = 0;
    for (const [k, v] of count) if (v > n) { best = k; n = v; }
    return { score: best, n };
  }, [rows]);

  const waText = useMemo(() => {
    if (!match) return "";
    const head = `🔮 PRONÓSTICOS DE LA PEÑA\n${match.group ? `${match.group} · ` : ""}${match.homeName} - ${match.awayName}\n${fmt(match.kickoffAt)}\n\n`;
    const body = rows.map((r) => `• ${r.name}: ${r.ph}-${r.pa}`).join("\n");
    const tail = topScore && topScore.n > 1 ? `\n\n🔥 Lo más puesto: ${topScore.score} (${topScore.n} personas)` : "";
    return head + body + tail;
  }, [match, rows, topScore]);

  const copyWA = async () => {
    try { await navigator.clipboard.writeText(waText); setCopiedWA(true); setTimeout(() => setCopiedWA(false), 1500); } catch {}
  };

  if (!match) {
    return (
      <div className="card mt-5 p-6 text-center text-sm text-[var(--text-dim)]">
        Aún no hay pronósticos que mostrar.
      </div>
    );
  }

  return (
    <div className="mt-5">
      {/* Selector de partido */}
      <label className="block text-[11px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-dim)]">Elige partido</label>
      <select value={match.id} onChange={(e) => setSelected(e.target.value)}
        className="mt-1.5 w-full rounded-xl border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-sm font-bold outline-none transition focus:border-[var(--accent)]">
        {withPreds.map((m) => (
          <option key={m.id} value={m.id}>
            {m.group ? `${m.group} · ` : ""}{m.homeName} - {m.awayName} · {fmt(m.kickoffAt)}
          </option>
        ))}
      </select>

      {/* Cabecera del partido */}
      <div className="card mt-3 p-4">
        <div className="flex items-center justify-center gap-3 text-sm font-bold">
          <span className="flex min-w-0 flex-1 items-center justify-end gap-2 truncate text-right">{match.homeName}<Flag src={match.homeFlag} name={match.homeName} /></span>
          <span className="flex-none rounded-lg bg-[var(--soft)] px-2.5 py-1 font-[family-name:var(--font-display)] text-base font-extrabold">
            {finished ? `${match.homeScore}-${match.awayScore}` : "vs"}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate"><Flag src={match.awayFlag} name={match.awayName} />{match.awayName}</span>
        </div>
        {finished && <div className="mt-2 text-center text-[11px] font-bold text-[var(--green)]">Resultado final · en verde quien lo clavó</div>}
        {topScore && topScore.n > 1 && (
          <div className="mt-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-center text-[12px] font-bold text-[var(--accent-deep)]">
            🔥 Lo más puesto: {topScore.score} ({topScore.n} {topScore.n === 1 ? "persona" : "personas"})
          </div>
        )}
      </div>

      {/* Control de admin: mandar al WhatsApp */}
      {isAdmin && (
        <div className="card mt-3 p-3">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-dim)]">🛠️ Admin · compartir este partido</div>
          <div className="flex gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-[var(--green)] px-4 py-2.5 text-center text-sm font-extrabold text-white transition active:scale-95">
              📤 Mandar al WhatsApp
            </a>
            <button onClick={copyWA}
              className="flex-none rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text-dim)] transition hover:bg-[var(--soft)]">
              {copiedWA ? "¡Copiado! ✓" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de pronósticos */}
      <div className="card mt-3 overflow-hidden p-0">
        {rows.map((r, i) => {
          const exact = finished && r.ph === match.homeScore && r.pa === match.awayScore;
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""} ${exact ? "bg-[var(--green-soft)]" : ""}`}>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.name}</span>
              {exact && <span className="flex-none text-[11px] font-extrabold text-[var(--green)]">¡clavado!</span>}
              <span className="flex-none font-[family-name:var(--font-display)] text-base font-extrabold">{r.ph}-{r.pa}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-dim)]">{rows.length} {rows.length === 1 ? "pronóstico" : "pronósticos"} en este partido.</p>
    </div>
  );
}
