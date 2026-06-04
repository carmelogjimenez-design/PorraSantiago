"use client";

import { useState } from "react";
import { saveMatch, releaseMatch } from "./actions";

type Match = {
  id: string; group: string; kickoff: string | null; status: string;
  home_score: number | null; away_score: number | null; manual: boolean;
  homeName: string; awayName: string;
};

function MatchRow({ m }: { m: Match }) {
  const [home, setHome] = useState<string>(m.home_score == null ? "" : String(m.home_score));
  const [away, setAway] = useState<string>(m.away_score == null ? "" : String(m.away_score));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const save = async (finished: boolean) => {
    setBusy(true); setDone(null);
    const h = home === "" ? null : parseInt(home, 10);
    const a = away === "" ? null : parseInt(away, 10);
    const r = await saveMatch(m.id, h, a, finished);
    setBusy(false);
    setDone(r?.ok ? "guardado ✓" : `error: ${r?.error || "?"}`);
  };

  const release = async () => {
    setBusy(true); setDone(null);
    const r = await releaseMatch(m.id);
    setBusy(false);
    setDone(r?.ok ? "en automático ✓" : `error: ${r?.error || "?"}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1 text-right text-[13px] font-bold">{m.homeName}</div>
      <input value={home} onChange={(e) => setHome(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
        className="w-10 rounded-lg border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[var(--accent)]" />
      <span className="text-xs font-bold text-[var(--text-dim)]">-</span>
      <input value={away} onChange={(e) => setAway(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
        className="w-10 rounded-lg border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[var(--accent)]" />
      <div className="min-w-0 flex-1 text-[13px] font-bold">{m.awayName}</div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {m.manual && <span className="rounded-md bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[var(--amber)]">manual</span>}
        {m.status === "finished" && <span className="rounded-md bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[var(--green)]">fin</span>}
        <button onClick={() => save(true)} disabled={busy}
          className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-[var(--accent-deep)] active:scale-95 disabled:opacity-60">
          {busy ? "…" : "Guardar fin"}
        </button>
        {m.manual && (
          <button onClick={release} disabled={busy}
            className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-bold text-[var(--text-dim)] transition hover:bg-[var(--soft)] active:scale-95 disabled:opacity-60">
            Auto
          </button>
        )}
        {done && <span className="text-[11px] font-semibold text-[var(--text-dim)]">{done}</span>}
      </div>
    </div>
  );
}

export default function ResultEditor({ matches }: { matches: Match[] }) {
  if (!matches.length) {
    return (
      <div className="card mt-5 p-5 text-center text-sm text-[var(--text-dim)]">
        Aún no hay partidos cargados. Aparecerán cuando el sync traiga el calendario del Mundial. ⚽
      </div>
    );
  }

  const groups = Array.from(new Set(matches.map((m) => m.group))).sort();

  return (
    <div className="mt-5 space-y-4">
      {groups.map((g) => (
        <div key={g || "x"} className="card p-4">
          <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            {g ? `Grupo ${g}` : "Otros"}
          </div>
          {matches.filter((m) => m.group === g).map((m) => <MatchRow key={m.id} m={m} />)}
        </div>
      ))}
    </div>
  );
}
