"use client";

import { useMemo, useState, useActionState } from "react";
import { saveScorers, type ScorerState } from "./actions";

export type PlayerVM = { id: string; name: string; pos: string; team: string; flag: string | null };

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) return <span className="h-5 w-7 flex-none rounded bg-[var(--soft)]" aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-5 w-7 flex-none rounded object-cover ring-1 ring-[var(--border)]" />;
}

const POS_LABEL: Record<string, string> = { GK: "Portero", DF: "Defensa", MF: "Centrocampista", FW: "Delantero" };

export default function ScorersPicker({
  players, initialSelected, locked,
}: { players: PlayerVM[]; initialSelected: string[]; locked: boolean }) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState("");
  const [state, action, pending] = useActionState<ScorerState, FormData>(saveScorers, null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players
      .filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      .slice(0, 40);
  }, [query, players]);

  const toggle = (id: string) => {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]
    );
  };

  return (
    <div className="min-w-0">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Goleadores</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Elige hasta <b className="text-[var(--text)]">3 goleadores</b>. Sumas <b className="text-[var(--text)]">3 puntos por cada gol</b> que marquen en el Mundial.
      </p>

      {/* elegidos */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => {
          const p = selected[i] ? byId.get(selected[i]) : null;
          return (
            <div key={i} className={`card flex flex-col items-center gap-1.5 p-3 text-center ${p ? "border-[var(--accent)]" : "border-dashed"}`}>
              <span className="text-[10px] font-extrabold tracking-wide text-[var(--text-dim)]">GOLEADOR {i + 1}</span>
              {p ? (
                <>
                  <Flag src={p.flag} name={p.team} />
                  <span className="text-[13px] font-bold leading-tight">{p.name}</span>
                  <span className="text-[10px] text-[var(--text-dim)]">{p.team}</span>
                  {!locked && (
                    <button type="button" onClick={() => toggle(p.id)}
                      className="mt-0.5 text-[11px] font-bold text-[var(--accent-deep)]">Quitar</button>
                  )}
                </>
              ) : (
                <span className="grid h-12 place-items-center text-2xl text-[var(--text-dim)]">＋</span>
              )}
            </div>
          );
        })}
      </div>

      {locked ? (
        <div className="mt-5 rounded-2xl bg-[var(--soft)] p-4 text-center text-sm font-bold text-[var(--text-dim)]">
          🔒 El Mundial ya empezó · tus goleadores están bloqueados
        </div>
      ) : (
        <>
          {/* buscador */}
          <div className="sticky top-0 z-20 mt-5 -mx-4 bg-white/90 px-4 py-3 backdrop-blur-lg lg:mx-0 lg:px-0">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca por jugador o selección (ej. Mbappé, España)…"
              className="w-full rounded-xl border-[1.5px] border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* resultados */}
          <div className="mt-2 space-y-1.5">
            {query.trim() === "" ? (
              <p className="py-6 text-center text-sm text-[var(--text-dim)]">
                Escribe el nombre de un jugador o de una selección para buscarlo 🔎
              </p>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-dim)]">Sin resultados para “{query}”.</p>
            ) : (
              results.map((p) => {
                const chosen = selected.includes(p.id);
                const full = selected.length >= 3 && !chosen;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    disabled={full}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      chosen ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-white"
                    } ${full ? "opacity-40" : "active:scale-[0.99]"}`}
                  >
                    <Flag src={p.flag} name={p.team} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{p.name}</span>
                      <span className="block text-[11px] text-[var(--text-dim)]">{p.team} · {POS_LABEL[p.pos] ?? p.pos}</span>
                    </span>
                    <span className={`text-lg font-extrabold ${chosen ? "text-[var(--accent)]" : "text-[var(--text-dim)]"}`}>
                      {chosen ? "✓" : "＋"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* guardar */}
          <form action={action} className="sticky bottom-20 z-20 mt-4 lg:bottom-4">
            {selected.map((id, i) => <input key={i} type="hidden" name={`player${i + 1}`} value={id} />)}
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white p-3 shadow-lg">
              <span className="text-xs">
                {state?.error ? <span className="font-bold text-[var(--accent-deep)]">{state.error}</span>
                  : state?.ok ? <span className="pop font-extrabold text-[var(--green)]">✓ Goleadores guardados</span>
                  : <span className="text-[var(--text-dim)]">{selected.length}/3 elegidos</span>}
              </span>
              <button type="submit" disabled={pending || selected.length === 0}
                className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-50">
                {pending ? "..." : "Guardar"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
