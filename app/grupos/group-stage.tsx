"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MatchCard from "./match-card";
import BottomNav from "../components/bottom-nav";

export type MatchVM = {
  id: string;
  groupId: number;
  kickoffAt: string;
  stadium: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeName: string;
  homeFlag: string | null;
  awayName: string;
  awayFlag: string | null;
  predHome: number | null;
  predAway: number | null;
  points: number | null;
};

export type GroupVM = { id: number; label: string; teams: string[] };

type Filter = "todos" | "pendientes" | "proximos" | "directo";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendientes", label: "Sin pronosticar" },
  { key: "proximos", label: "Próximos" },
  { key: "directo", label: "En directo" },
];

function isOpen(m: MatchVM) {
  return m.status === "scheduled" && new Date(m.kickoffAt).getTime() > Date.now();
}

function passesFilter(m: MatchVM, f: Filter) {
  if (f === "todos") return true;
  if (f === "pendientes") return isOpen(m) && m.predHome == null;
  if (f === "proximos") return isOpen(m);
  if (f === "directo") return m.status === "live";
  return true;
}

export default function GroupStage({
  groups,
  matches,
}: {
  groups: GroupVM[];
  matches: MatchVM[];
}) {
  const [filter, setFilter] = useState<Filter>("todos");

  const done = useMemo(
    () => matches.filter((m) => m.predHome != null).length,
    [matches]
  );
  const total = matches.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const byGroup = useMemo(() => {
    const map = new Map<number, MatchVM[]>();
    for (const m of matches) {
      const arr = map.get(m.groupId) ?? [];
      arr.push(m);
      map.set(m.groupId, arr);
    }
    return map;
  }, [matches]);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl pb-28">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-bold text-[var(--text-dim)]"
          >
            ← Inicio
          </Link>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
            Fase de grupos
          </h1>
        </div>
      </header>

      {/* Sticky progress */}
      <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 px-5 py-3 backdrop-blur-lg">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-[var(--text-dim)]">Tu progreso</span>
          <span>
            <b className="font-extrabold text-[var(--accent-deep)]">{done}</b>
            <span className="text-[var(--text-dim)]"> / {total} partidos</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="px-5">
        {/* Filtros */}
        <div className="no-bar -mx-5 flex gap-2 overflow-x-auto px-5 py-3.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-none rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition ${
                filter === f.key
                  ? "border-[var(--text)] bg-[var(--text)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--text-dim)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {groups.map((g) => {
          const all = byGroup.get(g.id) ?? [];
          const visible = all.filter((m) => passesFilter(m, filter));
          if (visible.length === 0) return null;
          const gDone = all.filter((m) => m.predHome != null).length;
          return (
            <section key={g.id} className="mt-5">
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-base font-extrabold text-white">
                  {g.label}
                </span>
                <span className="font-extrabold">Grupo {g.label}</span>
                <span className="ml-auto rounded-full bg-[var(--bg-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-dim)]">
                  {gDone}/{all.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {visible.map((m) => (
                  <MatchCard key={m.id} m={m} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
