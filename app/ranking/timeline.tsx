import { createClient } from "@/lib/supabase/server";

type Row = { taken_at: string; user_id: string; display_name: string; rank: number; points: number };

const COLORS = ["#ff2d55", "#f5b301", "#16a34a", "#7c3aed", "#0ea5e9", "#e0224a"];
const POS = ["#f5b301", "#9aa3af", "#cd7f32"]; // oro, plata, bronce
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
        <div className="mb-2 text-3xl">📊</div>
        <div className="font-[family-name:var(--font-display)] text-lg font-extrabold">Top 6 de la porra</div>
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
    points: lastUM.get(id)?.points ?? 0,
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
        <div className="mb-2 text-3xl">📊</div>
        <div className="font-[family-name:var(--font-display)] text-lg font-extrabold">Top 6 de la porra</div>
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

  // --- Puntos actuales (último día) para las barras ---
  const maxPoints = Math.max(...series.map((s) => s.points), 1);

  return (
    <div className="card mt-5 p-4 sm:p-5">
      <style>{`@keyframes pbgrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Top {N} de la porra</h2>
      </div>
      <p className="mb-4 text-[13px] text-[var(--text-dim)]">Quién manda ahora mismo. Tu barra va resaltada.</p>

      <div className="space-y-2.5">
        {series.map((s, i) => {
          const pct = s.points > 0 ? Math.max((s.points / maxPoints) * 100, 6) : 0;
          const barColor = s.isMe ? "var(--accent)" : i < 3 ? POS[i] : "var(--text-dim)";
          return (
            <div key={s.id} className={`flex items-center gap-3 rounded-xl p-2 ${s.isMe ? "bg-[var(--accent-soft)]" : ""}`}>
              <span
                className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-extrabold ${i < 3 ? "text-white" : "bg-[var(--soft)] text-[var(--text-dim)]"}`}
                style={i < 3 ? { background: POS[i] } : undefined}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={`truncate text-sm font-bold ${s.isMe ? "text-[var(--accent-deep)]" : ""}`}>
                    {s.name}{s.isMe ? " (tú)" : ""}
                  </span>
                  <span className="flex-none font-[family-name:var(--font-display)] text-sm font-extrabold">
                    {s.points}<span className="ml-0.5 text-[10px] font-bold text-[var(--text-dim)]">pts</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--soft)]">
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: barColor, transformOrigin: "left", animation: `pbgrow .6s ease-out ${i * 0.08}s both` }} />
                </div>
              </div>
            </div>
          );
        })}
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
