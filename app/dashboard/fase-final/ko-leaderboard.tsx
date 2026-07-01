"use client";

import Avatar from "../components/avatar";

export type KoLbRow = {
  user_id: string; display_name: string; avatar_url: string | null;
  total_points: number; aciertos: number; jugados: number;
};
const POS = ["#f5b301", "#9aa3af", "#cd7f32"];

export default function KoLeaderboard({ rows, meId }: { rows: KoLbRow[]; meId: string }) {
  const hasPoints = rows.some((r) => r.total_points > 0);
  return (
    <section className="mt-8">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-lg">🏁</span>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight">Clasificación fase final</h2>
      </div>
      <p className="mb-2.5 text-sm text-[var(--text-dim)]">Ranking nuevo, desde 0. Suma eliminatoria (3/5/8), goleadores y campeón/subcampeón.</p>
      {!hasPoints ? (
        <div className="card p-6 text-center">
          <div className="text-3xl">🏆</div>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-dim)]">
            Aún no ha puntuado nadie. Esto arranca con los dieciseisavos (28 jun).
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          {rows.map((r, i) => {
            const isMe = r.user_id === meId;
            return (
              <div key={r.user_id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""} ${isMe ? "bg-[var(--accent-soft)]" : ""}`}>
                <span className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-extrabold ${i < 3 ? "text-white" : "bg-[var(--soft)] text-[var(--text-dim)]"}`}
                  style={i < 3 ? { background: POS[i] } : undefined}>{i + 1}</span>
                <Avatar src={r.avatar_url} name={r.display_name} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{r.display_name}{isMe && <span className="text-[var(--accent)]"> (Tú)</span>}</span>
                  <span className="block text-[11px] text-[var(--text-dim)]">{r.aciertos} exactos · {r.jugados} jugados</span>
                </span>
                <span className="flex-none font-[family-name:var(--font-display)] text-lg font-extrabold">
                  {r.total_points}<span className="ml-0.5 text-[11px] font-bold text-[var(--text-dim)]">pts</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
