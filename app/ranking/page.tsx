import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Avatar from "../components/avatar";
import Icon from "../components/icons";

export const dynamic = "force-dynamic";

type LbRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number | string;
  exactos: number | string;
  jugados: number | string;
};

const PODIUM = [
  { h: 86, c: "#c0c5cd", pos: "2" },
  { h: 116, c: "var(--accent)", pos: "1" },
  { h: 66, c: "#d59a5f", pos: "3" },
];

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lbData } = await supabase.rpc("get_leaderboard");
  const lb = ((lbData ?? []) as LbRow[]).map((r) => ({
    ...r,
    total_points: Number(r.total_points),
    exactos: Number(r.exactos),
    jugados: Number(r.jugados),
  }));

  const me = lb.find((r) => r.user_id === user.id);
  const myPoints = me?.total_points ?? 0;
  const myName = me?.display_name ?? "Jugador";
  const topHasPoints = (lb[0]?.total_points ?? 0) > 0;
  const podium = topHasPoints ? [lb[1], lb[0], lb[2]] : [];

  return (
    <AppShell userName={myName} points={myPoints}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Ranking</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        {lb.length} {lb.length === 1 ? "jugador" : "jugadores"} en la porra · 3 pts exacto · 1 pt acierto.
      </p>

      {topHasPoints ? (
        <div className="card mt-5 flex items-end justify-center gap-3 p-6">
          {podium.map((p, i) =>
            p ? (
              <div key={p.user_id} className="flex-1 text-center">
                <Avatar src={p.avatar_url} name={p.display_name} className="mx-auto mb-2 h-14 w-14" textClass="text-lg" />
                <div className="grid place-items-start justify-center rounded-t-2xl pt-2.5 font-[family-name:var(--font-display)] text-xl font-extrabold text-white"
                  style={{ height: PODIUM[i].h, background: PODIUM[i].c }}>
                  {PODIUM[i].pos}
                </div>
                <div className="mt-2 truncate text-sm font-bold">{p.display_name}</div>
                <div className="text-xs text-[var(--text-dim)]">{p.total_points} pts</div>
              </div>
            ) : (
              <div key={i} className="flex-1" />
            )
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-[var(--soft)] p-6 text-center">
          <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--text-dim)]"><Icon name="trophy" className="h-6 w-6" /></div>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-extrabold">Todo por decidir</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-dim)]">
            El ranking se llena en cuanto terminen los primeros partidos del Mundial.
            ¡Deja tus pronósticos puestos para no quedarte atrás!
          </p>
          <Link href="/grupos" className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white">
            Ir a pronosticar
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {lb.map((r, i) => {
          const isMe = r.user_id === user.id;
          return (
            <div key={r.user_id}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${
                isMe ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-white"
              }`}>
              <span className={`w-6 text-center font-[family-name:var(--font-display)] text-base font-extrabold ${isMe ? "text-[var(--accent-deep)]" : "text-[var(--text-dim)]"}`}>
                {i + 1}
              </span>
              <Avatar src={r.avatar_url} name={r.display_name} className="h-9 w-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {r.display_name} {isMe && <span className="text-[var(--accent)]">(Tú)</span>}
                </span>
                <span className="block text-[11px] text-[var(--text-dim)]">
                  {r.exactos} exactos · {r.jugados} jugados
                </span>
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-extrabold">
                {r.total_points}
                <span className="ml-0.5 text-[11px] font-bold text-[var(--text-dim)]">pts</span>
              </span>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
