"use client";

import { useState } from "react";

export type PlayerOpt = { id: string; name: string };
export type GroupVM = { id: number; label: string };
export type ScorerVM = { id: string; name: string; team: string; flag: string | null; groupId: number; goals: number };

export default function GoleadoresViewer({
  players, groups, picksByUser,
}: {
  players: PlayerOpt[];
  groups: GroupVM[];
  picksByUser: Record<string, Record<number, ScorerVM>>;
}) {
  const [sel, setSel] = useState<string>("");
  const picks = sel ? (picksByUser[sel] ?? {}) : {};
  const chosen = Object.keys(picks).length;
  const totalGoals = Object.values(picks).reduce((s, sc) => s + sc.goals, 0);

  return (
    <div className="min-w-0">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Ver goleadores 🥅</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Modo admin: mira qué goleador eligió cada jugador en cada grupo. Solo lectura.
      </p>

      {/* Selector de jugador */}
      <div className="card mt-5 p-4 sm:p-5">
        <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Jugador</label>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="w-full rounded-xl border-[1.5px] border-[var(--border)] bg-white px-3.5 py-3 text-sm font-bold outline-none transition focus:border-[var(--accent)]">
          <option value="">— Elige un jugador —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {sel && (
        <>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--soft)] px-4 py-3">
            <span className="text-[13px] font-bold text-[var(--text-dim)]">
              Goleadores elegidos: <b className="text-[var(--text)]">{chosen}/12</b>
            </span>
            <span className="text-[13px] font-bold text-[var(--text-dim)]">
              Goles acumulados: <b className="text-[var(--accent-deep)]">{totalGoals}</b>
            </span>
          </div>

          <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
            {groups.map((g) => {
              const sc = picks[g.id];
              return (
                <div key={g.id} className="card flex items-center gap-3 p-3.5">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-base font-extrabold text-white">
                    {g.label}
                  </span>
                  {sc ? (
                    <>
                      {sc.flag
                        ? <img src={sc.flag} alt="" className="h-5 w-7 flex-none rounded-sm object-cover ring-1 ring-[var(--border)]" />
                        : <span className="h-5 w-7 flex-none rounded-sm bg-[var(--soft)]" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{sc.name}</span>
                        <span className="block truncate text-[11px] text-[var(--text-dim)]">{sc.team}</span>
                      </span>
                      <span className="flex-none font-[family-name:var(--font-display)] text-sm font-extrabold">
                        {sc.goals}<span className="ml-0.5 text-[10px] font-bold text-[var(--text-dim)]">{sc.goals === 1 ? "gol" : "goles"}</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-sm font-bold text-[var(--text-dim)]">— sin goleador —</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
