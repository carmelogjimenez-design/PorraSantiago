"use client";

import { useActionState } from "react";
import { savePrediction, type PredState } from "./actions";

type Props = {
  matchId: string;
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

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="flex h-6 w-9 items-center justify-center rounded bg-[var(--bg-soft)] text-[10px] text-[var(--text-dim)]">
        {name.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      className="h-6 w-9 rounded object-cover ring-1 ring-[var(--border)]"
    />
  );
}

export default function MatchCard(props: Props) {
  const [state, action, pending] = useActionState<PredState, FormData>(
    savePrediction,
    null
  );

  const kickoff = new Date(props.kickoffAt);
  const locked = props.status !== "scheduled" || kickoff.getTime() <= Date.now();
  const finished =
    props.status === "finished" &&
    props.homeScore != null &&
    props.awayScore != null;
  const live = props.status === "live";

  const dateStr = kickoff.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-dim)]">
        <span className="capitalize">{dateStr}</span>
        {props.stadium && (
          <span className="ml-2 max-w-[45%] truncate text-right">
            {props.stadium}
          </span>
        )}
      </div>

      {locked ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Flag src={props.homeFlag} name={props.homeName} />
              <span className="truncate text-sm font-semibold">
                {props.homeName}
              </span>
            </div>
            <div className="px-2 text-center">
              <div className="text-2xl font-extrabold leading-none">
                {finished || live
                  ? `${props.homeScore ?? 0} - ${props.awayScore ?? 0}`
                  : "—"}
              </div>
              <div
                className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${
                  live ? "text-[var(--accent)]" : "text-[var(--text-dim)]"
                }`}
              >
                {live ? "● En directo" : finished ? "Final" : "Cerrado"}
              </div>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="truncate text-right text-sm font-semibold">
                {props.awayName}
              </span>
              <Flag src={props.awayFlag} name={props.awayName} />
            </div>
          </div>

          <div className="mt-3 border-t border-[var(--border)] pt-2 text-xs text-[var(--text-dim)]">
            {props.predHome != null && props.predAway != null ? (
              <span>
                Tu pronóstico:{" "}
                <strong className="text-[var(--text)]">
                  {props.predHome}-{props.predAway}
                </strong>
                {finished && props.points != null && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 font-bold ${
                      props.points > 0
                        ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                        : "bg-[var(--bg-soft)]"
                    }`}
                  >
                    +{props.points} pts
                  </span>
                )}
              </span>
            ) : (
              <span>No pronosticaste este partido</span>
            )}
          </div>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="match_id" value={props.matchId} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Flag src={props.homeFlag} name={props.homeName} />
              <span className="truncate text-sm font-semibold">
                {props.homeName}
              </span>
            </div>
            <div className="flex items-center gap-1 px-1">
              <input
                name="pred_home"
                type="number"
                min="0"
                inputMode="numeric"
                defaultValue={props.predHome ?? ""}
                className="w-11 rounded-lg border border-[var(--border)] bg-white py-2 text-center text-lg font-bold outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[var(--text-dim)]">-</span>
              <input
                name="pred_away"
                type="number"
                min="0"
                inputMode="numeric"
                defaultValue={props.predAway ?? ""}
                className="w-11 rounded-lg border border-[var(--border)] bg-white py-2 text-center text-lg font-bold outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="truncate text-right text-sm font-semibold">
                {props.awayName}
              </span>
              <Flag src={props.awayFlag} name={props.awayName} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--text-dim)]">
              {state?.error ? (
                <span className="text-[var(--accent-deep)]">{state.error}</span>
              ) : state?.ok ? (
                "✓ Guardado"
              ) : props.predHome != null ? (
                "Pronóstico guardado"
              ) : (
                "Pon tu resultado"
              )}
            </span>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-bold text-white transition hover:bg-[var(--accent-deep)] disabled:opacity-50"
            >
              {pending ? "..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
