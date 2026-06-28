"use client";

import { useMemo, useState } from "react";

export type TeamLite = { name: string; flag: string | null };
export type BkPickVM = {
  slot: string; teamId: string | null; teamName: string | null; teamFlag: string | null;
  predHome: number | null; predAway: number | null; homeTeamId: string | null; awayTeamId: string | null;
};
export type BracketPlayer = { userId: string; displayName: string; picks: Record<string, BkPickVM> };

const ROUNDS = [
  { key: "R32", label: "Dieciseisavos", count: 16 },
  { key: "R16", label: "Octavos", count: 8 },
  { key: "QF", label: "Cuartos", count: 4 },
  { key: "SF", label: "Semifinales", count: 2 },
  { key: "FIN", label: "Final", count: 1 },
];

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="h-4 w-6 flex-none rounded-sm bg-[var(--soft)]" aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-4 w-6 flex-none rounded-sm object-cover" />;
}

export default function BracketView({ players, teamById }: { players: BracketPlayer[]; teamById: Record<string, TeamLite> }) {
  const sorted = useMemo(() => [...players].sort((a, b) => a.displayName.localeCompare(b.displayName)), [players]);
  const [sel, setSel] = useState<string>(sorted[0]?.userId ?? "");
  const p = sorted.find((x) => x.userId === sel) ?? sorted[0];

  if (!p) {
    return <div className="card mt-5 p-6 text-center text-sm text-[var(--text-dim)]">Aún no hay cuadros que mostrar.</div>;
  }

  const champ = p.picks["FIN-0"];
  const tName = (id: string | null) => (id ? teamById[id]?.name ?? "?" : "—");
  const tFlag = (id: string | null) => (id ? teamById[id]?.flag ?? null : null);

  return (
    <div className="mt-5">
      {/* Selector de jugador */}
      <label className="block text-[11px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-dim)]">Elige jugador</label>
      <select value={p.userId} onChange={(e) => setSel(e.target.value)}
        className="mt-1.5 w-full rounded-xl border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-sm font-bold outline-none transition focus:border-[var(--accent)]">
        {sorted.map((x) => (
          <option key={x.userId} value={x.userId}>{x.displayName}</option>
        ))}
      </select>

      {/* Campeón destacado */}
      {champ?.teamName && (
        <div className="card mt-3 flex items-center justify-center gap-2 bg-[var(--accent-soft)] p-3 text-center">
          <span className="text-lg">🏆</span>
          <span className="text-[12px] font-bold text-[var(--accent-deep)]">Campeón de {p.displayName}:</span>
          <Flag src={champ.teamFlag} name={champ.teamName} />
          <span className="font-[family-name:var(--font-display)] text-sm font-extrabold text-[var(--accent-deep)]">{champ.teamName}</span>
        </div>
      )}

      {/* Rondas */}
      {ROUNDS.map((R) => {
        const slots = Array.from({ length: R.count }, (_, i) => `${R.key}-${i}`);
        const any = slots.some((s) => p.picks[s]);
        if (!any) return null;
        return (
          <div key={R.key} className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-[3px] w-4 rounded-full bg-[var(--accent)]" />
              <h3 className="font-[family-name:var(--font-display)] text-sm font-extrabold tracking-tight">{R.label}</h3>
            </div>
            <div className="card overflow-hidden p-0">
              {slots.map((s, i) => {
                const pk = p.picks[s];
                if (!pk) return null;
                const homeWins = pk.teamId && pk.teamId === pk.homeTeamId;
                const awayWins = pk.teamId && pk.teamId === pk.awayTeamId;
                return (
                  <div key={s} className={`flex items-center gap-2 px-3 py-2.5 text-[13px] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                    <span className={`flex min-w-0 flex-1 items-center justify-end gap-1.5 truncate text-right ${homeWins ? "font-extrabold" : "text-[var(--text-dim)]"}`}>
                      {tName(pk.homeTeamId)}<Flag src={tFlag(pk.homeTeamId)} name={tName(pk.homeTeamId)} />
                    </span>
                    <span className="flex-none rounded-md bg-[var(--soft)] px-2 py-0.5 font-[family-name:var(--font-display)] text-[13px] font-extrabold">
                      {pk.predHome ?? "-"}-{pk.predAway ?? "-"}
                    </span>
                    <span className={`flex min-w-0 flex-1 items-center gap-1.5 truncate ${awayWins ? "font-extrabold" : "text-[var(--text-dim)]"}`}>
                      <Flag src={tFlag(pk.awayTeamId)} name={tName(pk.awayTeamId)} />{tName(pk.awayTeamId)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="mt-2 text-[11px] text-[var(--text-dim)]">El equipo en <b>negrita</b> es quien pasa según su cuadro.</p>
    </div>
  );
}
