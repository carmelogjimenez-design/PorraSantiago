"use client";

import { useState } from "react";
import { saveGoals } from "./actions";

type Player = { id: string; name: string; team: string; goals: number; override: number | null };

function PlayerRow({ p }: { p: Player }) {
  const [val, setVal] = useState<string>(p.override == null ? "" : String(p.override));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setDone(null);
    const override = val === "" ? null : parseInt(val, 10);
    const r = await saveGoals(p.id, override);
    setBusy(false);
    setDone(r?.ok ? "✓" : `error`);
  };

  const counted = val === "" ? p.goals : parseInt(val || "0", 10);

  return (
    <div className="flex items-center gap-2 border-t border-[var(--border)] py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold">{p.name}</div>
        <div className="truncate text-[12px] text-[var(--text-dim)]">{p.team} · auto: {p.goals} {p.goals === 1 ? "gol" : "goles"}</div>
      </div>
      <span className="text-[11px] font-semibold text-[var(--text-dim)]">cuenta {counted}×3</span>
      <input value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="auto"
        className="w-14 rounded-lg border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[var(--accent)]" />
      <button onClick={save} disabled={busy}
        className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-[var(--accent-deep)] active:scale-95 disabled:opacity-60">
        {busy ? "…" : "OK"}
      </button>
      {done && <span className="w-4 text-[12px] font-semibold text-[var(--text-dim)]">{done}</span>}
    </div>
  );
}

export default function GoalsEditor({ players }: { players: Player[] }) {
  if (!players.length) {
    return (
      <div className="card mt-5 p-5 text-center text-sm text-[var(--text-dim)]">
        Todavía nadie ha elegido goleadores. Cuando la peña los elija, aparecerán aquí. 🎯
      </div>
    );
  }
  return (
    <div className="card mt-5 p-4">
      {players.map((p) => <PlayerRow key={p.id} p={p} />)}
    </div>
  );
}
