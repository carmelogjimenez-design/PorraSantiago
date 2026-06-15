"use client";

import { useMemo, useState } from "react";
import { saveAdminPredictions } from "./actions";

type Player = { id: string; display_name: string | null };
type Match = { id: string; group_id: number | null; kickoff_at: string | null; home: string; away: string };
type Group = { id: number; label: string };
type Pred = { user_id: string; match_id: string; pred_home: number; pred_away: number };

export default function EditarForm({
  players,
  matches,
  groups,
  preds,
}: {
  players: Player[];
  matches: Match[];
  groups: Group[];
  preds: Pred[];
}) {
  const [userId, setUserId] = useState<string>("");
  const [edits, setEdits] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const groupLabel = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);

  // Agrupa por group_id; los partidos sin grupo (null) van a la clave -1 ("Otros")
  const byGroup = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      const key = m.group_id ?? -1;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const ka = a[0] === -1 ? 9999 : a[0]; // "Otros" al final
      const kb = b[0] === -1 ? 9999 : b[0];
      return ka - kb;
    });
  }, [matches]);

  function pickPlayer(id: string) {
    setUserId(id);
    setMsg(null);
    const next: Record<string, { home: string; away: string }> = {};
    for (const mt of matches) {
      const p = preds.find((x) => x.user_id === id && x.match_id === mt.id);
      next[mt.id] = {
        home: p ? String(p.pred_home) : "",
        away: p ? String(p.pred_away) : "",
      };
    }
    setEdits(next);
  }

  function setVal(matchId: string, side: "home" | "away", value: string) {
    const v = value.replace(/[^0-9]/g, "").slice(0, 2);
    setEdits((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: "", away: "" }), [side]: v },
    }));
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    const rows = Object.entries(edits)
      .filter(([, v]) => v.home !== "" && v.away !== "")
      .map(([match_id, v]) => ({
        match_id,
        pred_home: parseInt(v.home, 10),
        pred_away: parseInt(v.away, 10),
      }));
    const res = await saveAdminPredictions(userId, rows);
    setSaving(false);
    if (res.ok) setMsg({ ok: true, text: `✅ Guardado: ${res.count} pronósticos actualizados.` });
    else setMsg({ ok: false, text: `⚠️ ${res.error ?? "Error al guardar"}` });
  }

  const filled = Object.values(edits).filter((v) => v.home !== "" && v.away !== "").length;
  const playerName = players.find((p) => p.id === userId)?.display_name ?? "";

  return (
    <div className="mx-auto w-full max-w-2xl pb-24">
      <h1 className="text-2xl font-extrabold">Editar pronósticos ✍️</h1>
      <p className="mt-1 text-[14px] text-[var(--text-dim)]">
        Modo admin: corrige los pronósticos de cualquier jugador, incluso con el Mundial ya empezado.
      </p>

      <div className="card mt-4 p-4">
        <label className="text-[13px] font-bold text-[var(--text-dim)]">Jugador</label>
        <select
          value={userId}
          onChange={(e) => pickPlayer(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold"
        >
          <option value="">— Elige un jugador —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name ?? "Jugador"}
            </option>
          ))}
        </select>
      </div>

      {userId && (
        <>
          <div className="sticky top-2 z-10 mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
            <div className="text-[13px] text-[var(--text-dim)]">
              <span className="font-extrabold text-[var(--text)]">{playerName}</span> · {filled}/{matches.length} con marcador
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : "💾 Guardar"}
            </button>
          </div>

          {msg && (
            <div
              className={`mt-3 rounded-xl border p-3 text-sm font-semibold ${
                msg.ok
                  ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)]"
                  : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-4 space-y-5">
            {byGroup.map(([gid, ms]) => (
              <div key={gid} className="card p-4">
                <div className="mb-2 text-sm font-extrabold">
                  {gid === -1 ? "Otros partidos (eliminatoria / sin grupo)" : `Grupo ${groupLabel.get(gid) ?? gid}`}
                </div>
                <div className="space-y-2">
                  {ms.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="flex-1 truncate text-right text-sm font-semibold">{m.home}</div>
                      <input
                        inputMode="numeric"
                        value={edits[m.id]?.home ?? ""}
                        onChange={(e) => setVal(m.id, "home", e.target.value)}
                        className="w-12 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1.5 text-center text-sm font-bold"
                      />
                      <span className="text-[var(--text-dim)]">-</span>
                      <input
                        inputMode="numeric"
                        value={edits[m.id]?.away ?? ""}
                        onChange={(e) => setVal(m.id, "away", e.target.value)}
                        className="w-12 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1.5 text-center text-sm font-bold"
                      />
                      <div className="flex-1 truncate text-sm font-semibold">{m.away}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
