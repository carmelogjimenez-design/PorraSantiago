"use client";
import { useState } from "react";

export type RfPred = { userId: string; name: string; home: number; away: number };
export type RfScorer = { name: string; goals: number };
export type RfMatch = {
  matchId: string;
  round: string;
  order: number;
  homeName: string; homeFlag: string | null;
  awayName: string; awayFlag: string | null;
  homeScore: number | null; awayScore: number | null;
  status: string; kickoff: string | null;
  scorersHome: RfScorer[]; scorersAway: RfScorer[];
  preds: RfPred[];
};

const ROUNDS: { key: string; label: string }[] = [
  { key: "R32", label: "Dieciseisavos" },
  { key: "R16", label: "Octavos" },
  { key: "QF", label: "Cuartos" },
  { key: "SF", label: "Semifinales" },
  { key: "FIN", label: "Final" },
];

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="inline-block h-4 w-6 flex-none rounded bg-[var(--soft)]" aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-4 w-6 flex-none rounded object-cover ring-1 ring-[var(--border)]" />;
}

function fmtScorers(list: RfScorer[]): string {
  return list.map((s) => (s.goals > 1 ? `${s.name} ×${s.goals}` : s.name)).join(", ");
}

export default function ResultsBracket({ matches, meId }: { matches: RfMatch[]; meId: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const byRound = (k: string) => matches.filter((m) => m.round === k).sort((a, b) => a.order - b.order);

  return (
    <div className="mt-6 space-y-7">
      {ROUNDS.map((r) => {
        const ms = byRound(r.key);
        if (!ms.length) return null;
        return (
          <section key={r.key}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-[3px] w-4 rounded bg-[var(--accent)]" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">{r.label}</h2>
              <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-dim)]">{ms.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ms.map((m) => (
                <MatchCard
                  key={m.matchId}
                  m={m}
                  open={open === m.matchId}
                  onToggle={() => setOpen(open === m.matchId ? null : m.matchId)}
                  meId={meId}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MatchCard({ m, open, onToggle, meId }: { m: RfMatch; open: boolean; onToggle: () => void; meId: string }) {
  const finished = m.status === "finished" && m.homeScore !== null && m.awayScore !== null;
  const live = m.status === "live";
  const hs = m.homeScore;
  const as = m.awayScore;
  const homeWon = finished && (hs as number) > (as as number);
  const awayWon = finished && (as as number) > (hs as number);
  const tie = finished && (hs as number) === (as as number);

  const when = m.kickoff
    ? new Date(m.kickoff).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

  const scH = fmtScorers(m.scorersHome);
  const scA = fmtScorers(m.scorersAway);
  const hasScorers = m.scorersHome.length > 0 || m.scorersAway.length > 0;

  return (
    <div className="card overflow-hidden p-0">
      {/* marcador */}
      <div className="p-3.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            {finished ? "Final" : live ? "En juego" : when}
          </span>
          {live && <span className="rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--green)]">LIVE</span>}
        </div>

        <Row flag={m.homeFlag} name={m.homeName} score={hs} bold={homeWon} dim={awayWon} />
        <Row flag={m.awayFlag} name={m.awayName} score={as} bold={awayWon} dim={homeWon} />

        {tie && <div className="mt-1 text-right text-[10px] font-bold text-[var(--text-dim)]">Empate · decidido en prórroga/penaltis</div>}

        {/* goleadores */}
        {hasScorers && (
          <div className="mt-2.5 border-t border-[var(--border)] pt-2 text-[12px] leading-snug">
            {scH && <div className="flex gap-1.5"><span>⚽</span><span><span className="font-semibold">{m.homeName}:</span> <span className="text-[var(--text-dim)]">{scH}</span></span></div>}
            {scA && <div className="mt-0.5 flex gap-1.5"><span>⚽</span><span><span className="font-semibold">{m.awayName}:</span> <span className="text-[var(--text-dim)]">{scA}</span></span></div>}
          </div>
        )}
      </div>

      {/* pronósticos de la peña */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between border-t border-[var(--border)] bg-[var(--soft)] px-3.5 py-2 text-[12px] font-bold text-[var(--text-dim)] transition hover:text-[var(--accent)]"
      >
        <span>{m.preds.length > 0 ? `Pronósticos de la peña (${m.preds.length})` : "Sin pronósticos para este cruce"}</span>
        {m.preds.length > 0 && <span className={`transition ${open ? "rotate-180" : ""}`}>▾</span>}
      </button>

      {open && m.preds.length > 0 && (
        <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {m.preds.map((p, i) => {
            const exact = finished && p.home === hs && p.away === as;
            const mine = p.userId === meId;
            return (
              <div
                key={p.userId + i}
                className={`flex items-center justify-between px-3.5 py-2 text-[13px] ${mine ? "bg-[var(--accent-soft)]" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {p.name}{mine && <span className="ml-1 text-[10px] font-extrabold text-[var(--accent)]">(tú)</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-display)] font-extrabold tabular-nums">{p.home}-{p.away}</span>
                  {exact && <span title="Resultado exacto" className="text-[var(--green)]">✓</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ flag, name, score, bold, dim }: { flag: string | null; name: string; score: number | null; bold: boolean; dim: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-0.5 ${dim ? "opacity-55" : ""}`}>
      <Flag src={flag} name={name} />
      <span className={`min-w-0 flex-1 truncate text-[14px] ${bold ? "font-extrabold" : "font-semibold"}`}>{name}</span>
      <span className={`font-[family-name:var(--font-display)] text-[15px] tabular-nums ${bold ? "font-extrabold text-[var(--accent)]" : "font-bold"}`}>
        {score === null ? "–" : score}
      </span>
    </div>
  );
}
