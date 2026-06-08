import { createClient } from "@/lib/supabase/server";

type Row = { taken_at: string; user_id: string; display_name: string; rank: number; points: number };

const COLORS = ["#ff2d55", "#f5b301", "#16a34a", "#7c3aed", "#0ea5e9", "#e0224a"];
const TOP_N = 6;

export default async function RankingTimeline({ meId }: { meId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_ranking_history");
  const history = (data ?? []) as Row[];

  // Agrupar por día (último snapshot de cada día por usuario)
  const byDay = new Map<string, Map<string, { rank: number; points: number; name: string; taken_at: string }>>();
  for (const r of history) {
    const dk = String(r.taken_at).slice(0, 10);
    if (!byDay.has(dk)) byDay.set(dk, new Map());
    const um = byDay.get(dk)!;
    const prev = um.get(r.user_id);
    if (!prev || r.taken_at > prev.taken_at) um.set(r.user_id, { rank: r.rank, points: r.points, name: r.display_name, taken_at: r.taken_at });
  }
  const days = [...byDay.keys()].sort();

  // --- Estado vacío: el Mundial aún no ha arrancado ---
  if (days.length === 0) {
    return (
      <div className="card mt-5 p-6 text-center">
        <div className="mb-2 text-3xl">🎬</div>
        <div className="font-[family-name:var(--font-display)] text-lg font-extrabold">La película de la porra</div>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-dim)]">
          Aquí verás quién manda, quién remonta y quién se hunde día a día. Arranca cuando ruede el balón (11 jun). 🍿
        </p>
      </div>
    );
  }

  const lastDay = days[days.length - 1];
  const lastUM = byDay.get(lastDay)!;
  const rankedNow = [...lastUM.entries()].sort((a, b) => a[1].rank - b[1].rank);
  const N = Math.min(TOP_N, rankedNow.length);
  const topIds = rankedNow.slice(0, N).map(([id]) => id);

  // Series por usuario top: rank por día (o null si ese día no tiene foto)
  const series = topIds.map((id, i) => ({
    id,
    name: lastUM.get(id)?.name ?? "Jugador",
    color: COLORS[i % COLORS.length],
    isMe: id === meId,
    ranks: days.map((d) => byDay.get(d)!.get(id)?.rank ?? null),
  }));

  // Días en cabeza (rank 1) por usuario
  const leadCount = new Map<string, { name: string; days: number }>();
  for (const d of days) {
    for (const [id, v] of byDay.get(d)!) {
      if (v.rank === 1) {
        const e = leadCount.get(id) ?? { name: v.name, days: 0 };
        e.days += 1;
        leadCount.set(id, e);
      }
    }
  }
  const topLeaders = [...leadCount.values()].sort((a, b) => b.days - a.days).slice(0, 3);

  // Racha del líder actual
  const leaderEntry = rankedNow.find(([, v]) => v.rank === 1);
  let streak = 0;
  let leaderName = "";
  if (leaderEntry) {
    leaderName = leaderEntry[1].name;
    for (let i = days.length - 1; i >= 0; i--) {
      const v = byDay.get(days[i])!.get(leaderEntry[0]);
      if (v && v.rank === 1) streak++;
      else break;
    }
  }

  // --- Estado "calentando": 1 solo día, todavía no hay líneas ---
  if (days.length < 2) {
    return (
      <div className="card mt-5 p-6 text-center">
        <div className="mb-2 text-3xl">🎬</div>
        <div className="font-[family-name:var(--font-display)] text-lg font-extrabold">La película de la porra</div>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-dim)]">
          Primer día en marcha. Vuelve mañana y empezarás a ver cómo sube y baja la peña. 📈
        </p>
        {leaderName && (
          <p className="mt-3 text-sm font-bold">
            👑 Ahora manda <span className="text-[var(--accent)]">{leaderName}</span>
          </p>
        )}
      </div>
    );
  }

  // --- Geometría del bump chart ---
  const maxRank = Math.max(...series.flatMap((s) => s.ranks.filter((r): r is number => r != null)), N);
  const colW = days.length > 8 ? 38 : 52;
  const rowH = 26;
  const leftM = 34;
  const topM = 16;
  const labelW = 96;
  const W = leftM + (days.length - 1) * colW + labelW;
  const H = topM + (maxRank - 1) * rowH + 28;
  const x = (i: number) => leftM + i * colW;
  const y = (rank: number) => topM + (rank - 1) * rowH;

  // Etiquetas de día (DD/MM); si hay muchos, una de cada dos
  const dayStep = days.length > 9 ? 2 : 1;

  return (
    <div className="card mt-5 p-4 sm:p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">🎬</span>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">La película de la porra</h2>
      </div>
      <p className="mb-3 text-[13px] text-[var(--text-dim)]">Evolución del top {N} día a día. Tu línea va resaltada.</p>

      <div className="-mx-1 overflow-x-auto pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-none" role="img" aria-label="Evolución del ranking">
          {/* Líneas guía + posiciones en el eje Y */}
          {Array.from({ length: maxRank }, (_, k) => k + 1).map((rk) => (
            <g key={`row-${rk}`}>
              <line x1={leftM} y1={y(rk)} x2={leftM + (days.length - 1) * colW} y2={y(rk)} stroke="var(--border)" strokeWidth={1} />
              <text x={leftM - 10} y={y(rk) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--text-dim)">{rk}º</text>
            </g>
          ))}
          {/* Etiquetas de día */}
          {days.map((d, i) =>
            i % dayStep === 0 ? (
              <text key={`d-${d}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-dim)">
                {d.slice(8, 10)}/{d.slice(5, 7)}
              </text>
            ) : null
          )}
          {/* Líneas de cada jugador (las del resto primero, la tuya encima) */}
          {[...series].sort((a, b) => Number(a.isMe) - Number(b.isMe)).map((s) => {
            const pts: Array<[number, number]> = [];
            s.ranks.forEach((rk, i) => { if (rk != null) pts.push([x(i), y(rk)]); });
            if (pts.length === 0) return null;
            const path = pts.map((p) => p.join(",")).join(" ");
            const lastPt = pts[pts.length - 1];
            const sw = s.isMe ? 4 : 2.5;
            return (
              <g key={s.id}>
                <polyline points={path} fill="none" stroke={s.color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity={s.isMe ? 1 : 0.85} />
                {pts.map((p, idx) => (
                  <circle key={idx} cx={p[0]} cy={p[1]} r={s.isMe ? 4 : 3} fill="#fff" stroke={s.color} strokeWidth={s.isMe ? 3 : 2} />
                ))}
                <text x={lastPt[0] + 8} y={lastPt[1] + 4} fontSize={11} fontWeight={s.isMe ? 800 : 700} fill={s.color}>
                  {s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name}{s.isMe ? " (tú)" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Récords */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--soft)] p-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">👑 Más días en cabeza</div>
          <div className="mt-1 space-y-0.5 text-sm font-bold">
            {topLeaders.length > 0 ? topLeaders.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="truncate">{l.name}</span>
                <span className="flex-none text-[var(--text-dim)]">{l.days} {l.days === 1 ? "día" : "días"}</span>
              </div>
            )) : <span className="text-[var(--text-dim)]">—</span>}
          </div>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] p-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--accent-deep)]">🔥 Racha del líder</div>
          {leaderName ? (
            <div className="mt-1 text-sm font-bold">
              {leaderName} lleva <span className="text-[var(--accent)]">{streak} {streak === 1 ? "día" : "días"}</span> seguidos en cabeza
            </div>
          ) : <div className="mt-1 text-sm font-bold text-[var(--text-dim)]">—</div>}
        </div>
      </div>
    </div>
  );
}
