"use client";

import { useMemo, useState, useActionState } from "react";
import { saveGroupScorers, type ScorerGroupState } from "./group-actions";

export type PlayerVM = { id: string; name: string; pos: string; team: string; flag: string | null; groupId: number };
type Group = { id: number; label: string };

const POS_LABEL: Record<string, string> = { GK: "Portero", DF: "Defensa", MF: "Centrocampista", FW: "Delantero" };
function posShort(pos: string) {
  return (({ GK: "POR", DF: "DEF", MF: "MED", FW: "DEL" } as Record<string, string>)[pos]) ?? (pos || "?").slice(0, 3).toUpperCase();
}

function Flag({ src, name, cls }: { src: string | null; name: string; cls?: string }) {
  const base = cls ?? "h-5 w-7";
  if (!src) return <span className={`${base} flex-none rounded bg-[var(--soft)]`} aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className={`${base} flex-none rounded object-cover ring-1 ring-[var(--border)]`} />;
}

export default function ScorersPicker({
  players, groups, initialByGroup, locked,
}: { players: PlayerVM[]; groups: Group[]; initialByGroup: Record<number, string>; locked: boolean }) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const playersByGroup = useMemo(() => {
    const m = new Map<number, PlayerVM[]>();
    for (const p of players) {
      if (!m.has(p.groupId)) m.set(p.groupId, []);
      m.get(p.groupId)!.push(p);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.team === b.team ? a.name.localeCompare(b.name) : a.team.localeCompare(b.team)));
    return m;
  }, [players]);

  // Equipos únicos (con bandera) por grupo, para el header de cada tarjeta
  const teamsByGroup = useMemo(() => {
    const m = new Map<number, { team: string; flag: string | null }[]>();
    for (const [gid, arr] of playersByGroup) {
      const seen = new Map<string, string | null>();
      for (const p of arr) if (!seen.has(p.team)) seen.set(p.team, p.flag);
      m.set(gid, Array.from(seen, ([team, flag]) => ({ team, flag })).sort((a, b) => a.team.localeCompare(b.team)));
    }
    return m;
  }, [playersByGroup]);

  const [picks, setPicks] = useState<Record<number, string>>(initialByGroup);
  const [open, setOpen] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [state, action, pending] = useActionState<ScorerGroupState, FormData>(saveGroupScorers, null);

  const chosenCount = groups.filter((g) => picks[g.id]).length;
  const pick = (gid: number, id: string) => { setPicks((p) => ({ ...p, [gid]: id })); setOpen(null); setQuery(""); };
  const clear = (gid: number) => setPicks((p) => { const n = { ...p }; delete n[gid]; return n; });

  return (
    <div className="min-w-0">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Goleadores 🥅</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Elige <b className="text-[var(--text)]">1 goleador por grupo</b>. Cada gol que metan te da <b className="text-[var(--text)]">3 puntos</b>.
      </p>

      {/* Progreso */}
      <div className="card mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Tu progreso</span>
          <span className="font-[family-name:var(--font-display)] text-sm font-extrabold">{chosenCount}<span className="text-[var(--text-dim)]">/12</span></span>
        </div>
        <div className="mt-2.5 flex gap-1">
          {groups.map((g) => (
            <div key={g.id} className={`h-1.5 flex-1 rounded-full transition-colors ${picks[g.id] ? "bg-[var(--accent)]" : "bg-[var(--soft)]"}`} />
          ))}
        </div>
        {chosenCount === 12 && <div className="mt-2 text-[12px] font-extrabold text-[var(--green)]">¡Los 12 grupos listos! 🔥</div>}
      </div>

      {locked && (
        <div className="mt-4 rounded-2xl bg-[var(--soft)] p-4 text-center text-sm font-bold text-[var(--text-dim)]">
          🔒 El Mundial ya empezó · tus goleadores están bloqueados
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {groups.map((g) => {
          const pid = picks[g.id];
          const p = pid ? byId.get(pid) : null;
          const isOpen = open === g.id;
          const gTeams = teamsByGroup.get(g.id) ?? [];
          const all = playersByGroup.get(g.id) ?? [];
          const q = query.trim().toLowerCase();
          const list = (q ? all.filter((pl) => pl.name.toLowerCase().includes(q) || pl.team.toLowerCase().includes(q)) : all).slice(0, 120);
          return (
            <div key={g.id} className={`card overflow-hidden p-0 transition ${p ? "border-[var(--accent)]" : ""}`}>
              <div className="flex items-center gap-3 p-3">
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-2xl font-[family-name:var(--font-display)] text-lg font-extrabold ${p ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"}`}>{g.label}</span>
                <div className="min-w-0 flex-1">
                  {p ? (
                    <div className="flex items-center gap-2">
                      <Flag src={p.flag} name={p.team} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold">{p.name}</div>
                        <div className="truncate text-[11px] text-[var(--text-dim)]">{p.team} · {POS_LABEL[p.pos] ?? p.pos}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-extrabold">Grupo {g.label}</div>
                      <div className="mt-1 flex items-center gap-1">
                        {gTeams.slice(0, 4).map((t, i) => <Flag key={i} src={t.flag} name={t.team} cls="h-3.5 w-5" />)}
                        <span className="ml-1 text-[11px] text-[var(--text-dim)]">elige tu goleador</span>
                      </div>
                    </div>
                  )}
                </div>
                {!locked && (
                  <button type="button" onClick={() => { setOpen(isOpen ? null : g.id); setQuery(""); }}
                    className={`flex-none rounded-xl px-3.5 py-2 text-[12px] font-extrabold transition active:scale-95 ${p ? "bg-[var(--soft)] text-[var(--text)]" : "bg-[var(--accent)] text-white"}`}>
                    {isOpen ? "Cerrar" : p ? "Cambiar" : "Elegir"}
                  </button>
                )}
              </div>

              {isOpen && !locked && (
                <div className="border-t border-[var(--border)] bg-[var(--soft)] p-3">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder={`Busca en el grupo ${g.label}…`}
                    className="w-full rounded-xl border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
                  <div className="mt-2 max-h-80 space-y-1 overflow-y-auto pr-1">
                    {(() => {
                      let lastTeam: string | null = null;
                      return list.map((pl) => {
                        const chosen = picks[g.id] === pl.id;
                        let header: string | null = null;
                        if (pl.team !== lastTeam) { header = pl.team; lastTeam = pl.team; }
                        return (
                          <div key={pl.id}>
                            {header && (
                              <div className="flex items-center gap-2 px-1 pb-1 pt-2">
                                <Flag src={pl.flag} name={pl.team} cls="h-3.5 w-5" />
                                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--text-dim)]">{header}</span>
                              </div>
                            )}
                            <button type="button" onClick={() => pick(g.id, pl.id)}
                              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${chosen ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-transparent bg-white hover:border-[var(--border)]"} active:scale-[0.99]`}>
                              <span className="grid h-7 w-9 flex-none place-items-center rounded-lg bg-[var(--soft)] text-[10px] font-extrabold text-[var(--text-dim)]">{posShort(pl.pos)}</span>
                              <span className="min-w-0 flex-1 truncate text-sm font-bold">{pl.name}</span>
                              <span className={`flex-none text-lg font-extrabold ${chosen ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>{chosen ? "✓" : "＋"}</span>
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {p && (
                    <button type="button" onClick={() => clear(g.id)} className="mt-2 text-[12px] font-bold text-[var(--accent-deep)]">
                      Quitar elección del grupo {g.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!locked && (
        <form action={action} className="sticky bottom-20 z-20 mt-4 lg:bottom-4">
          {groups.map((g) => (picks[g.id] ? <input key={g.id} type="hidden" name={`g${g.id}`} value={picks[g.id]} /> : null))}
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white p-3 shadow-lg">
            <span className="text-xs">
              {state?.error ? <span className="font-bold text-[var(--accent-deep)]">{state.error}</span>
                : state?.ok ? <span className="font-extrabold text-[var(--green)]">✓ Goleadores guardados</span>
                : <span className="text-[var(--text-dim)]">{chosenCount}/12 grupos</span>}
            </span>
            <button type="submit" disabled={pending || chosenCount === 0}
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-50">
              {pending ? "..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
