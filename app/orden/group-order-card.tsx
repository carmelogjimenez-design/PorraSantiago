"use client";

import { useState, useActionState } from "react";
import { saveGroupOrder, type OrderState } from "./actions";

export type Team = { id: string; name: string; flag: string | null };

const POS = [
  { n: "1º", pts: 10 },
  { n: "2º", pts: 5 },
  { n: "3º", pts: 3 },
  { n: "4º", pts: 4 },
];

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src)
    return <span className="grid h-6 w-8 flex-none place-items-center rounded bg-[var(--soft)] text-[9px] font-bold text-[var(--text-dim)]">{name.slice(0, 3).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-6 w-8 flex-none rounded object-cover ring-1 ring-[var(--border)]" />;
}

export default function GroupOrderCard({
  groupId, label, teams, initialOrder, locked, savedAlready,
}: {
  groupId: number; label: string; teams: Team[];
  initialOrder: string[]; locked: boolean; savedAlready: boolean;
}) {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [state, action, pending] = useActionState<OrderState, FormData>(saveGroupOrder, null);
  const [dirty, setDirty] = useState(false);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setDirty(true);
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-base font-extrabold text-white">{label}</span>
        <span className="font-extrabold">Grupo {label}</span>
        {savedAlready && !dirty && (
          <span className="ml-auto rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--green)]">✓ Guardado</span>
        )}
      </div>

      <form action={action}>
        <input type="hidden" name="group_id" value={groupId} />
        {order.map((id, i) => <input key={i} type="hidden" name={`rank${i + 1}`} value={id} />)}

        <div className="space-y-1.5">
          {order.map((id, i) => {
            const t = byId.get(id);
            return (
              <div key={id} className="flex items-center gap-2.5 rounded-xl bg-[var(--soft)] px-3 py-2">
                <span className="w-9 flex-none">
                  <span className="font-[family-name:var(--font-display)] text-base font-extrabold">{POS[i].n}</span>
                  <span className="ml-1 text-[10px] font-bold text-[var(--text-dim)]">{POS[i].pts}p</span>
                </span>
                <Flag src={t?.flag ?? null} name={t?.name ?? "?"} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{t?.name ?? "?"}</span>
                {!locked && (
                  <span className="flex flex-none gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--border)] bg-white text-sm disabled:opacity-30" aria-label="Subir">↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--border)] bg-white text-sm disabled:opacity-30" aria-label="Bajar">↓</button>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!locked && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs">
              {state?.error ? <span className="font-bold text-[var(--accent-deep)]">{state.error}</span>
                : state?.ok ? <span className="pop font-extrabold text-[var(--green)]">✓ Guardado</span>
                : <span className="text-[var(--text-dim)]">Ordena y guarda</span>}
            </span>
            <button type="submit" disabled={pending}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-extrabold text-white transition active:scale-95 disabled:opacity-50">
              {pending ? "..." : "Guardar"}
            </button>
          </div>
        )}
        {locked && <div className="mt-3 text-center text-xs font-bold text-[var(--text-dim)]">🔒 Bloqueado · la fase de grupos ya empezó</div>}
      </form>
    </div>
  );
}
