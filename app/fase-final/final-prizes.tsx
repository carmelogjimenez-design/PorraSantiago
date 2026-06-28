"use client";

import { useActionState, useState } from "react";
import { saveFinalScorers, type KoState } from "./actions";

export type ScorerOpt = { id: string; name: string; team: string; flag: string | null; goals: number };

function FinalScorers({ options, initial }: { options: ScorerOpt[]; initial: string[] }) {
  const [state, action, pending] = useActionState<KoState, FormData>(saveFinalScorers, null);
  const [sel, setSel] = useState<string[]>(initial);

  const toggle = (id: string) => {
    setSel((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) return cur; // máx 3
      return [...cur, id];
    });
  };

  return (
    <form action={action} className="card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">⚽</span>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Tus 3 goleadores</h2>
        <span className="ml-auto rounded-full bg-[var(--soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-dim)]">{sel.length}/3</span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--text-dim)]">Elige 3 de tus 12 goleadores. Cuentan hasta el final, 3 pts por gol (incluidos los de grupos).</p>

      {sel.map((id) => <input key={id} type="hidden" name="player_id" value={id} />)}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = sel.includes(o.id);
          const disabled = !active && sel.length >= 3;
          return (
            <button type="button" key={o.id} onClick={() => toggle(o.id)} disabled={disabled}
              className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : disabled ? "border-[var(--border)] opacity-40" : "border-[var(--border)] hover:border-[var(--text-dim)]"
              }`}>
              <span className={`grid h-5 w-5 flex-none place-items-center rounded-full border-2 ${active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)]"}`}>
                {active ? "✓" : ""}
              </span>
              {o.flag && <img src={o.flag} alt="" className="h-4 w-6 flex-none rounded-sm object-cover" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{o.name}</span>
                <span className="block truncate text-[11px] text-[var(--text-dim)]">{o.team} · {o.goals} {o.goals === 1 ? "gol" : "goles"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className="text-xs">
          {state?.error ? <span className="font-bold text-[var(--accent-deep)]">{state.error}</span>
            : state?.ok ? <span className="font-extrabold text-[var(--green)]">✓ Goleadores guardados</span>
            : <span className="text-[var(--text-dim)]">Marca hasta 3 y guarda.</span>}
        </span>
        <button type="submit" disabled={pending || sel.length === 0}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-extrabold text-white transition active:scale-95 disabled:opacity-50">
          {pending ? "..." : "Guardar goleadores"}
        </button>
      </div>
    </form>
  );
}

export default function FinalPrizes({ scorerOptions, initialScorers }:
  { scorerOptions: ScorerOpt[]; initialScorers: string[] }) {
  return (
    <section className="mt-6">
      <FinalScorers options={scorerOptions} initial={initialScorers} />
    </section>
  );
}
