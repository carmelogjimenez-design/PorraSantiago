"use client";

import { useMemo, useState, useActionState } from "react";
import { saveGroupScorers, type ScorerGroupState } from "./group-actions";

export type PlayerVM = { id: string; name: string; pos: string; team: string; flag: string | null; groupId: number };
type Group = { id: number; label: string };

const POS_LABEL: Record<string, string> = { GK: "Portero", DF: "Defensa", MF: "Centrocampista", FW: "Delantero" };

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="h-5 w-7 flex-none rounded bg-[var(--soft)]" aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-5 w-7 flex-none rounded object-cover ring-1 ring-[var(--border)]" />;
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
        Elige <b className="text-[var(--text)]">1 goleador por grupo</b> (12 en total). Sumas <b className="text-[var(--text)]">3 puntos por cada gol</b> que marquen en el Mundial.
      </p>

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
          const q = query.trim().toLowerCase();
          const list = (playersByGroup.get(g.id) ?? [])
            .filter((pl) => (q ? pl.name.toLowerCase().includes(q) || pl.team.toLowerCase().includes(q) : true))
            .slice(0, 80);
          return (
            <div key={g.id} className={`card p-3 ${p ? "border-[var(--accent)]" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--accent-soft)] font-[family-name:var(--font-display)] text-sm font-extrabold text-[var(--accent-deep)]">{g.label}</span>
                <div className="min-w-0 flex-1">
                  {p ? (
                    <div className="flex items-center gap-2">
                      <Flag src={p.flag} name={p.team} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{p.name}</div>
                        <div className="truncate text-[11px] text-[var(--text-dim)]">{p.team}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-[var(--text-dim)]">Grupo {g.label} · sin elegir</span>
                  )}
                </div>
                {!locked && (
                  <button type="button" onClick={() => { setOpen(isOpen ? null : g.id); setQuery(""); }}
                    className="flex-none rounded-lg bg-[var(--soft)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--text)]">
                    {p ? "Cambiar" : "Elegir"}
                  </button>
                )}
              </div>

              {isOpen && !locked && (
                <div className="mt-3">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Busca en el grupo ${g.label}…`}
                    autoFocus
                    className="w-full rounded-xl border-[1.5px] border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {list.map((pl) => {
                      const chosen = picks[g.id] === pl.id;
                      return (
                        <button key={pl.id} type="button" onClick={() => pick(g.id, pl.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${chosen ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-white"} active:scale-[0.99]`}>
                          <Flag src={pl.flag} name={pl.team} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{pl.name}</span>
                            <span className="block text-[11px] text-[var(--text-dim)]">{pl.team} · {POS_LABEL[pl.pos] ?? pl.pos}</span>
                          </span>
                          <span className={`text-lg font-extrabold ${chosen ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>{chosen ? "✓" : "＋"}</span>
                        </button>
                      );
                    })}
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
