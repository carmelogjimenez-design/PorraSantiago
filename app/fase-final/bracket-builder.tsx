"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BkTeamVM = { id: string; name: string; flag: string | null };
export type BkR32VM = { matchId: string; home: BkTeamVM; away: BkTeamVM; kickoff: string; status: string };
export type BkPick = { teamId: string | null; predHome: number | null; predAway: number | null };
export type BkInitial = Record<string, BkPick>;

const ROUNDS = [
  { key: "R32", label: "Dieciseisavos", count: 16 },
  { key: "R16", label: "Octavos", count: 8 },
  { key: "QF", label: "Cuartos", count: 4 },
  { key: "SF", label: "Semifinales", count: 2 },
  { key: "FIN", label: "Final", count: 1 },
];
const ALL_SLOTS: string[] = ROUNDS.flatMap((r) => Array.from({ length: r.count }, (_, i) => `${r.key}-${i}`));

function Flag({ src, name, sm }: { src: string | null; name: string; sm?: boolean }) {
  const cls = sm ? "h-5 w-7" : "h-6 w-8";
  if (!src)
    return <span className={`${cls} grid flex-none place-items-center rounded bg-[var(--soft)] text-[9px] font-bold text-[var(--text-dim)]`}>{name.slice(0, 3).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className={`${cls} flex-none rounded object-cover ring-1 ring-[var(--border)]`} />;
}

export default function BracketBuilder({ r32, initial, locked }: { r32: BkR32VM[]; initial: BkInitial; locked: boolean }) {
  const supabase = createClient();

  // Mapa de equipos (todos los posibles salen de los 16avos)
  const teamById = useMemo(() => {
    const m = new Map<string, BkTeamVM>();
    for (const x of r32) { m.set(x.home.id, x.home); m.set(x.away.id, x.away); }
    return m;
  }, [r32]);

  const [picks, setPicks] = useState<Record<string, BkPick>>(() => {
    const p: Record<string, BkPick> = {};
    for (const s of ALL_SLOTS) if (initial[s]) p[s] = { ...initial[s] };
    return p;
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [dirty, setDirty] = useState(false);

  const winnerOf = (slot: string): string | null => picks[slot]?.teamId ?? null;

  // Los dos equipos que se enfrentan en un slot
  function participants(roundIdx: number, i: number): [BkTeamVM | null, BkTeamVM | null] {
    if (roundIdx === 0) { const m = r32[i]; return [m?.home ?? null, m?.away ?? null]; }
    const prev = ROUNDS[roundIdx - 1].key;
    const a = winnerOf(`${prev}-${2 * i}`);
    const b = winnerOf(`${prev}-${2 * i + 1}`);
    return [a ? teamById.get(a) ?? null : null, b ? teamById.get(b) ?? null : null];
  }

  // Limpia downstream cuando cambia un ganador (un slot deja de ser válido si su ganador ya no es participante)
  function prune(p: Record<string, BkPick>): Record<string, BkPick> {
    const next = { ...p };
    for (let r = 1; r < ROUNDS.length; r++) {
      for (let i = 0; i < ROUNDS[r].count; i++) {
        const slot = `${ROUNDS[r].key}-${i}`;
        const prev = ROUNDS[r - 1].key;
        const a = next[`${prev}-${2 * i}`]?.teamId ?? null;
        const b = next[`${prev}-${2 * i + 1}`]?.teamId ?? null;
        const cur = next[slot]?.teamId ?? null;
        if (cur && cur !== a && cur !== b) delete next[slot]; // el ganador ya no juega ahí
      }
    }
    return next;
  }

  function setWinner(slot: string, teamId: string) {
    setPicks((p) => {
      const cur = p[slot] ?? { teamId: null, predHome: null, predAway: null };
      const next = { ...p, [slot]: { ...cur, teamId } };
      return prune(next);
    });
    setDirty(true); setStatus("idle");
  }

  function setScore(roundIdx: number, i: number, side: "home" | "away", raw: string) {
    const slot = `${ROUNDS[roundIdx].key}-${i}`;
    const val = raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
    setPicks((p) => {
      const cur = p[slot] ?? { teamId: null, predHome: null, predAway: null };
      const updated: BkPick = { ...cur };
      if (side === "home") updated.predHome = val; else updated.predAway = val;
      // si el marcador es decisivo, el que más mete pasa (se puede cambiar a mano si hay empate)
      const [pa, pb] = participants(roundIdx, i);
      if (updated.predHome != null && updated.predAway != null && updated.predHome !== updated.predAway && pa && pb) {
        updated.teamId = updated.predHome > updated.predAway ? pa.id : pb.id;
      }
      const next = { ...p, [slot]: updated };
      return prune(next);
    });
    setDirty(true); setStatus("idle");
  }

  async function save() {
    setSaving(true); setStatus("idle");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("error"); setSaving(false); return; }

      const rows: Array<Record<string, unknown>> = [];
      const emptySlots: string[] = [];
      ROUNDS.forEach((R, r) => {
        for (let i = 0; i < R.count; i++) {
          const slot = `${R.key}-${i}`;
          const pk = picks[slot];
          const [pa, pb] = participants(r, i);
          if (pk?.teamId) {
            rows.push({
              user_id: user.id, slot, team_id: pk.teamId,
              home_team_id: pa?.id ?? null, away_team_id: pb?.id ?? null,
              pred_home: pk.predHome, pred_away: pk.predAway,
              updated_at: new Date().toISOString(),
            });
          } else {
            emptySlots.push(slot);
          }
        }
      });

      if (rows.length) {
        const { error } = await supabase.from("bracket_picks").upsert(rows, { onConflict: "user_id,slot" });
        if (error) { setStatus("error"); setSaving(false); return; }
      }
      if (emptySlots.length) {
        await supabase.from("bracket_picks").delete().eq("user_id", user.id).in("slot", emptySlots);
      }
      setStatus("saved"); setDirty(false);
    } catch {
      setStatus("error");
    }
    setSaving(false);
  }

  const filled = ALL_SLOTS.filter((s) => picks[s]?.teamId).length;

  // Campeón / subcampeón derivados de la final
  const [finA, finB] = participants(4, 0);
  const champId = winnerOf("FIN-0");
  const champ = champId ? teamById.get(champId) ?? null : null;
  const runner = champId && finA && finB ? (champId === finA.id ? finB : finA) : null;

  return (
    <section className="mt-8">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Tu cuadro · hasta la final</h2>
        <span className="ml-auto rounded-full bg-[var(--soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-dim)]">{filled}/31</span>
      </div>
      <p className="mb-3 text-[13px] text-[var(--text-dim)]">
        Pon ganador y marcador en cada cruce. El que pase arma la ronda siguiente, hasta la final. Marcador exacto = 3/5/8 cuando tu cruce coincide con el real.
      </p>

      {locked && (
        <div className="card mb-3 p-3 text-center text-[13px] font-bold text-[var(--text-dim)]">
          🔒 El cuadro está cerrado (ya arrancó la eliminatoria). Esto es lo que dejaste puesto.
        </div>
      )}

      {ROUNDS.map((R, r) => {
        // ¿hay algo que mostrar en esta ronda? (16avos siempre; el resto si la anterior tiene ganadores)
        return (
          <div key={R.key} className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-[3px] w-4 rounded-full" style={{ background: "linear-gradient(135deg,#FF2D55,#FF5C7A)" }} />
              <h3 className="font-[family-name:var(--font-display)] text-[13px] font-extrabold uppercase tracking-wide text-[var(--accent)]">{R.label}</h3>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {Array.from({ length: R.count }, (_, i) => {
                const slot = `${R.key}-${i}`;
                const [pa, pb] = participants(r, i);
                const pick = picks[slot];
                const ready = !!pa && !!pb;
                if (!ready) {
                  return (
                    <div key={slot} className="card flex items-center justify-center p-4 text-[12px] font-semibold text-[var(--text-dim)]" style={{ borderStyle: "dashed" }}>
                      Esperando ronda anterior…
                    </div>
                  );
                }
                const teamRow = (t: BkTeamVM, side: "home" | "away") => {
                  const isWin = pick?.teamId === t.id;
                  const scoreVal = side === "home" ? pick?.predHome : pick?.predAway;
                  return (
                    <div className={`flex items-center gap-2 rounded-xl px-2 py-1.5 transition ${isWin ? "bg-[var(--accent-soft)]" : ""}`}>
                      <button type="button" disabled={locked} onClick={() => setWinner(slot, t.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default">
                        <Flag src={t.flag} name={t.name} sm />
                        <span className={`truncate text-[13px] ${isWin ? "font-extrabold text-[var(--accent-deep)]" : "font-bold"}`}>{t.name}</span>
                        {isWin && <span className="flex-none text-[10px] font-extrabold text-[var(--accent)]">PASA ✓</span>}
                      </button>
                      <input type="number" min="0" inputMode="numeric" disabled={locked}
                        value={scoreVal != null ? String(scoreVal) : ""} placeholder="–"
                        onChange={(e) => setScore(r, i, side, e.target.value)}
                        className="h-9 w-9 flex-none rounded-lg border-[1.5px] border-[var(--border)] text-center font-[family-name:var(--font-display)] text-base font-extrabold outline-none transition focus:border-[var(--accent)] disabled:opacity-60" />
                    </div>
                  );
                };
                return (
                  <div key={slot} className="card p-2">
                    {teamRow(pa as BkTeamVM, "home")}
                    <div className="my-0.5 h-px bg-[var(--border)]" />
                    {teamRow(pb as BkTeamVM, "away")}
                    {!pick?.teamId && <div className="px-2 pt-1 text-[10px] font-bold text-[var(--text-dim)]">Toca al que pasa</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Campeón / subcampeón */}
      <div className="card mt-2 p-4">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">Tu final</div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-bold text-[var(--text-dim)]">🏆 Campeón</div>
            <div className="mt-1 flex items-center gap-2">
              {champ ? <><Flag src={champ.flag} name={champ.name} sm /><span className="text-sm font-extrabold">{champ.name}</span></>
                : <span className="text-[13px] text-[var(--text-dim)]">Por decidir</span>}
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-[var(--text-dim)]">+15 pts</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--text-dim)]">🥈 Subcampeón</div>
            <div className="mt-1 flex items-center gap-2">
              {runner ? <><Flag src={runner.flag} name={runner.name} sm /><span className="text-sm font-extrabold">{runner.name}</span></>
                : <span className="text-[13px] text-[var(--text-dim)]">Por decidir</span>}
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-[var(--text-dim)]">+10 pts</div>
          </div>
        </div>
      </div>

      {!locked && (
        <div className="sticky bottom-3 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/95 p-3 shadow-lg backdrop-blur">
          <span className="text-[12px] font-bold">
            {status === "saved" && !dirty ? <span className="text-[var(--green)]">✓ Cuadro guardado</span>
              : status === "error" ? <span className="text-[var(--accent-deep)]">No se pudo guardar, reinténtalo</span>
              : dirty ? <span className="text-[var(--text-dim)]">Tienes cambios sin guardar</span>
              : <span className="text-[var(--text-dim)]">{filled}/31 cruces puestos</span>}
          </span>
          <button type="button" onClick={save} disabled={saving}
            className="flex-none rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar mi cuadro"}
          </button>
        </div>
      )}
    </section>
  );
}
