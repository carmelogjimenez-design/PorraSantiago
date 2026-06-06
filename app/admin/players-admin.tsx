"use client";

import { useState } from "react";
import { deleteUser } from "./actions";

type Player = { id: string; name: string; paid: boolean };

export default function PlayersAdmin({ players, meId }: { players: Player[]; meId: string }) {
  const [list, setList] = useState(players);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusy(id);
    setError(null);
    const r = await deleteUser(id);
    setBusy(null);
    if (r?.ok) {
      setList((l) => l.filter((p) => p.id !== id));
      setConfirming(null);
    } else {
      setError(r?.error || "No se pudo eliminar");
      setConfirming(null);
    }
  };

  return (
    <div className="mt-5">
      {error && (
        <div className="mb-3 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[13px] font-bold text-[var(--accent-deep)]">{error}</div>
      )}
      <div className="card p-2 sm:p-3">
        {list.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-dim)]">No hay jugadores.</p>
        ) : (
          list.map((p, i) => {
            const isMe = p.id === meId;
            const isConfirming = confirming === p.id;
            return (
              <div key={p.id} className={`flex items-center gap-3 px-2 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {p.name}
                  {isMe && <span className="ml-2 rounded-md bg-[var(--soft)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[var(--text-dim)]">tú</span>}
                  {!p.paid && <span className="ml-2 rounded-md bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[var(--amber)]">sin pagar</span>}
                </span>

                {isMe ? (
                  <span className="text-[12px] text-[var(--text-dim)]">—</span>
                ) : isConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--accent-deep)]">¿Seguro?</span>
                    <button onClick={() => remove(p.id)} disabled={busy === p.id}
                      className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-extrabold text-white transition active:scale-95 disabled:opacity-60">
                      {busy === p.id ? "…" : "Sí, eliminar"}
                    </button>
                    <button onClick={() => setConfirming(null)} disabled={busy === p.id}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-dim)] transition hover:bg-[var(--soft)]">
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setConfirming(p.id); setError(null); }}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
                    Eliminar
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-dim)]">
        Eliminar borra la cuenta del jugador y todos sus pronósticos de forma permanente.
      </p>
    </div>
  );
}
