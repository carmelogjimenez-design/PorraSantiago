"use client";

import { useActionState } from "react";
import { savePrediction, type PredState } from "./actions";
import type { MatchVM } from "./group-stage";

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src)
    return (
      <span className="grid h-7 w-9 flex-none place-items-center rounded bg-[var(--soft)] text-[10px] font-bold text-[var(--text-dim)]">
        {name.slice(0, 3).toUpperCase()}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-7 w-9 flex-none rounded object-cover ring-1 ring-[var(--border)]" />;
}

export default function MatchCard({ m }: { m: MatchVM }) {
  const [state, action, pending] = useActionState<PredState, FormData>(savePrediction, null);

  const kickoff = new Date(m.kickoffAt);
  const open = m.status === "scheduled" && kickoff.getTime() > Date.now();
  const live = m.status === "live";
  const finished = m.status === "finished" && m.homeScore != null && m.awayScore != null;

  const dateStr = kickoff.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const justSaved = state?.ok;

  return (
    <div className={`card p-3.5 ${live ? "border-[var(--accent)]" : ""}`}>
      <div className="mb-3 flex items-center justify-between text-[11px] text-[var(--text-dim)]">
        {live ? (
          <span className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-[var(--accent)]">
            <span className="blink h-[7px] w-[7px] rounded-full bg-[var(--accent)]" />En directo
          </span>
        ) : (
          <span className="capitalize">{finished ? "Final" : dateStr}</span>
        )}
        {m.stadium && <span className="ml-2 max-w-[45%] truncate text-right">{m.stadium}</span>}
      </div>

      {open ? (
        <form action={action}>
          <input type="hidden" name="match_id" value={m.id} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Flag src={m.homeFlag} name={m.homeName} />
              <span className="truncate text-sm font-bold">{m.homeName}</span>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <input name="pred_home" type="number" min="0" inputMode="numeric" defaultValue={m.predHome ?? ""} placeholder="–"
                className="h-11 w-11 rounded-xl border-[1.5px] border-[var(--border)] text-center font-[family-name:var(--font-display)] text-xl font-extrabold outline-none transition focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]" />
              <span className="font-bold text-[var(--text-dim)]">-</span>
              <input name="pred_away" type="number" min="0" inputMode="numeric" defaultValue={m.predAway ?? ""} placeholder="–"
                className="h-11 w-11 rounded-xl border-[1.5px] border-[var(--border)] text-center font-[family-name:var(--font-display)] text-xl font-extrabold outline-none transition focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="truncate text-right text-sm font-bold">{m.awayName}</span>
              <Flag src={m.awayFlag} name={m.awayName} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
            <span className="text-xs">
              {state?.error ? <span className="font-bold text-[var(--accent-deep)]">{state.error}</span>
                : justSaved ? <span className="pop font-extrabold text-[var(--green)]">✓ Guardado</span>
                : m.predHome != null ? <span className="text-[var(--text-dim)]">Pronóstico: {m.predHome}-{m.predAway}</span>
                : <span className="text-[var(--text-dim)]">Pon tu resultado</span>}
            </span>
            <button type="submit" disabled={pending}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-extrabold text-white transition active:scale-95 disabled:opacity-50">
              {pending ? "..." : m.predHome != null ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Flag src={m.homeFlag} name={m.homeName} />
              <span className="truncate text-sm font-bold">{m.homeName}</span>
            </div>
            <div className="flex-none px-2 text-center font-[family-name:var(--font-display)] text-2xl font-extrabold">
              {finished || live ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : "—"}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="truncate text-right text-sm font-bold">{m.awayName}</span>
              <Flag src={m.awayFlag} name={m.awayName} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-xs">
            {m.predHome != null
              ? <span className="text-[var(--text-dim)]">Tu pronóstico: <b className="text-[var(--text)]">{m.predHome}-{m.predAway}</b></span>
              : <span className="text-[var(--text-dim)]">No pronosticaste</span>}
            {finished && m.points != null && (
              <span className={`rounded-full px-2.5 py-1 font-extrabold ${m.points > 0 ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]" : "bg-[var(--soft)] text-[var(--text-dim)]"}`}>
                +{m.points} {m.points === 3 ? "pts 🎯" : "pts"}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
