"use client";

import { useMemo, useState } from "react";
import MatchCard from "./match-card";

export type MatchVM = {
  id: string; groupId: number; kickoffAt: string; stadium: string | null;
  status: string; homeScore: number | null; awayScore: number | null;
  homeName: string; homeFlag: string | null; awayName: string; awayFlag: string | null;
  predHome: number | null; predAway: number | null; points: number | null;
  scorerBonus: number; scorerHits: { name: string; goals: number }[];
};
export type GroupVM = { id: number; label: string; teams: string[] };

type StandingRow = {
  name: string; flag: string | null;
  pj: number; g: number; e: number; p: number; gf: number; gc: number;
};

type Filter = "todos" | "pendientes" | "proximos" | "directo";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendientes", label: "Sin pronosticar" },
  { key: "proximos", label: "Próximos" },
  { key: "directo", label: "En directo" },
];

const isOpen = (m: MatchVM) =>
  m.status === "scheduled" && new Date(m.kickoffAt).getTime() > Date.now();

function passes(m: MatchVM, f: Filter) {
  if (f === "todos") return true;
  if (f === "pendientes") return isOpen(m) && m.predHome == null;
  if (f === "proximos") return isOpen(m);
  if (f === "directo") return m.status === "live";
  return true;
}

export default function GroupStage({ groups, matches }: { groups: GroupVM[]; matches: MatchVM[] }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const done = useMemo(() => matches.filter((m) => m.predHome != null).length, [matches]);
  const total = matches.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const byGroup = useMemo(() => {
    const map = new Map<number, MatchVM[]>();
    for (const m of matches) {
      const arr = map.get(m.groupId) ?? [];
      arr.push(m); map.set(m.groupId, arr);
    }
    return map;
  }, [matches]);

  // Corte global: pitido inicial del PRIMER partido del Mundial
  const lockAt = useMemo(() => {
    const ts = matches.map((m) => new Date(m.kickoffAt).getTime()).filter((n) => !isNaN(n));
    return ts.length ? Math.min(...ts) : Infinity;
  }, [matches]);

  // Clasificación por grupo: resultado real si el partido se jugó, si no tu pronóstico
  const standingsByGroup = useMemo(() => {
    const flagByName = new Map<string, string | null>();
    for (const m of matches) {
      flagByName.set(m.homeName, m.homeFlag);
      flagByName.set(m.awayName, m.awayFlag);
    }
    const out = new Map<number, StandingRow[]>();
    for (const g of groups) {
      const rows = new Map<string, StandingRow>();
      for (const t of g.teams) rows.set(t, { name: t, flag: flagByName.get(t) ?? null, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 });
      for (const m of matches.filter((mm) => mm.groupId === g.id)) {
        let h: number | null = null;
        let a: number | null = null;
        if (m.status === "finished" && m.homeScore != null && m.awayScore != null) {
          h = m.homeScore; a = m.awayScore;
        } else if (m.predHome != null && m.predAway != null) {
          h = m.predHome; a = m.predAway;
        }
        if (h == null || a == null) continue;
        const rh = rows.get(m.homeName);
        const ra = rows.get(m.awayName);
        if (!rh || !ra) continue;
        rh.pj++; ra.pj++;
        rh.gf += h; rh.gc += a; ra.gf += a; ra.gc += h;
        if (h > a) { rh.g++; ra.p++; }
        else if (h < a) { ra.g++; rh.p++; }
        else { rh.e++; ra.e++; }
      }
      const list = [...rows.values()].sort((x, y) => {
        const px = x.g * 3 + x.e, py = y.g * 3 + y.e;
        if (py !== px) return py - px;
        const dx = x.gf - x.gc, dy = y.gf - y.gc;
        if (dy !== dx) return dy - dx;
        if (y.gf !== x.gf) return y.gf - x.gf;
        return x.name.localeCompare(y.name);
      });
      out.set(g.id, list);
    }
    return out;
  }, [groups, matches]);

  return (
    <div className="min-w-0">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
        Fase de grupos
      </h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Pon tu resultado exacto · 3 pts si lo clavas · 1 pt si aciertas el ganador.
      </p>

      {/* sticky progress */}
      <div className="sticky top-0 z-20 mt-4 -mx-4 border-y border-[var(--border)] bg-white/90 px-4 py-3 backdrop-blur-lg lg:mx-0 lg:rounded-2xl lg:border">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-[var(--text-dim)]">Tu progreso</span>
          <span><b className="font-extrabold text-[var(--accent)]">{done}</b>
            <span className="text-[var(--text-dim)]"> / {total} partidos</span></span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--soft)]">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* filtros */}
      <div className="no-bar -mx-4 flex gap-2 overflow-x-auto px-4 py-4 lg:mx-0 lg:px-0">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-none rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition ${
              filter === f.key
                ? "border-[var(--text)] bg-[var(--text)] text-white"
                : "border-[var(--border)] bg-white text-[var(--text-dim)]"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {groups.map((g) => {
        const all = byGroup.get(g.id) ?? [];
        const visible = all.filter((m) => passes(m, filter));
        if (visible.length === 0) return null;
        const gDone = all.filter((m) => m.predHome != null).length;
        const rows = standingsByGroup.get(g.id) ?? [];
        return (
          <section key={g.id} className="mt-5">
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-base font-extrabold text-white">
                {g.label}
              </span>
              <span className="font-extrabold">Grupo {g.label}</span>
              <span className="ml-auto rounded-full bg-[var(--soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-dim)]">
                {gDone}/{all.length}
              </span>
            </div>

            {/* Clasificación según tus pronósticos */}
            {rows.length > 0 && (
              <div className="card mb-2.5 overflow-hidden p-0">
                <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-dim)]">Clasificación</span>
                  <span className="text-[10px] font-bold text-[var(--text-dim)]">según tus pronósticos</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
                      <th className="w-7 py-1.5 text-center font-bold"></th>
                      <th className="py-1.5 pl-1 pr-1 text-left font-bold">Equipo</th>
                      <th className="px-1 text-center font-bold">PJ</th>
                      <th className="hidden px-1 text-center font-bold sm:table-cell">G</th>
                      <th className="hidden px-1 text-center font-bold sm:table-cell">E</th>
                      <th className="hidden px-1 text-center font-bold sm:table-cell">P</th>
                      <th className="px-1 text-center font-bold">DG</th>
                      <th className="py-1.5 pl-1 pr-3 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const dg = r.gf - r.gc;
                      const pts = r.g * 3 + r.e;
                      return (
                        <tr key={r.name} className={`border-t border-[var(--border)] ${idx < 2 ? "bg-[var(--green-soft)]" : ""}`}>
                          <td className="py-2 text-center font-extrabold text-[var(--text-dim)]">{idx + 1}</td>
                          <td className="py-2 pl-1 pr-1">
                            <span className="flex min-w-0 items-center gap-2">
                              {r.flag && <img src={r.flag} alt="" className="h-3.5 w-5 flex-none rounded-sm object-cover" />}
                              <span className="truncate font-bold">{r.name}</span>
                            </span>
                          </td>
                          <td className="px-1 text-center text-[var(--text-dim)]">{r.pj}</td>
                          <td className="hidden px-1 text-center text-[var(--text-dim)] sm:table-cell">{r.g}</td>
                          <td className="hidden px-1 text-center text-[var(--text-dim)] sm:table-cell">{r.e}</td>
                          <td className="hidden px-1 text-center text-[var(--text-dim)] sm:table-cell">{r.p}</td>
                          <td className="px-1 text-center font-bold">{dg > 0 ? `+${dg}` : dg}</td>
                          <td className="py-2 pl-1 pr-3 text-center font-[family-name:var(--font-display)] font-extrabold">{pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-3 pb-2 pt-1 text-[10px] text-[var(--text-dim)]">
                  <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[var(--green-soft)] align-middle" /> pasarían de ronda (1º y 2º)
                </div>
              </div>
            )}

            <div className="grid gap-2.5 lg:grid-cols-2">
              {visible.map((m) => <MatchCard key={m.id} m={m} lockAt={lockAt} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
