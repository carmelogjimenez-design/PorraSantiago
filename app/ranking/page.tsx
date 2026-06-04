import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Avatar from "../components/avatar";
import Icon from "../components/icons";
import RankingTools from "./ranking-tools";

export const dynamic = "force-dynamic";

type LbRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number | string;
  exactos: number | string;
  jugados: number | string;
  rank: number | string;
  prev_rank: number | null;
  delta_points: number | string;
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

  const { data: lbData } = await supabase.rpc("get_ranking_movement");
  const lb = ((lbData ?? []) as LbRow[]).map((r) => ({
    ...r,
    total_points: Number(r.total_points),
    exactos: Number(r.exactos),
    jugados: Number(r.jugados),
    delta_points: Number(r.delta_points),
    prev_rank: r.prev_rank == null ? null : Number(r.prev_rank),
  }));

  const me = lb.find((r) => r.user_id === user.id);
  const myPoints = me?.total_points ?? 0;
  const myName = me?.display_name ?? "Jugador";
  const topHasPoints = (lb[0]?.total_points ?? 0) > 0;
  const podium = topHasPoints ? [lb[1], lb[0], lb[2]] : [];

  const meIdx = lb.findIndex((r) => r.user_id === user.id);
  const pos = meIdx + 1;
  const isTail = topHasPoints && meIdx >= 0 && lb.length >= 3 && pos >= Math.ceil(lb.length * 0.75);
  const TAUNTS = [
    "Vas en el fondo de la tabla, crack. Pero tranqui: ser un puto paquete en el fútbol no es tan grave… como en la vida, lo importante es participar. 🫶",
    "Último confirmado. Alguien tiene que sujetar la clasificación para que no se caiga, ¡y mira qué bien lo haces! Lo importante es participar. 🏗️",
    "El VAR ha revisado tu puesto y lo confirma: vas de culo. Pero eres más de disfrutar que de ganar, y eso también cuenta. A participar, campeón. 😏",
    "Spoiler: remontar lo vas a tener crudo. Da igual ser malísimo en el fútbol, como en todo lo importante es participar (y haber pagado el Bizum). 😂",
    "Estás a un pasito de pedir el cambio… pero ahí sigues, con dos cojones. Un paquete con honor. Lo importante es participar. 💪",
  ];
  const taunt = isTail ? TAUNTS[Math.floor(Math.random() * TAUNTS.length)] : null;

  const shareLines = lb.slice(0, 10).map((r, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    return `${medal} ${r.display_name} — ${r.total_points} pts`;
  });
  const shareText =
    "🏆 LA PORRA DE SANTIAGO\nClasificación:\n" +
    shareLines.join("\n") +
    "\n\n👉 https://porra-santiago.vercel.app";
  const rivals = lb
    .filter((r) => r.user_id !== user.id)
    .map((r) => ({ id: r.user_id, name: r.display_name, points: r.total_points }));

  const moved = lb.some((r) => r.delta_points > 0);
  const byDelta = moved ? [...lb].sort((a, b) => b.delta_points - a.delta_points) : [];
  const mvp = moved ? byDelta[0] : null;
  const donkey = moved && byDelta.length > 1 ? byDelta[byDelta.length - 1] : null;

  return (
    <AppShell userName={myName} points={myPoints}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Ranking</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        {lb.length} {lb.length === 1 ? "jugador" : "jugadores"} en la porra · 3 pts exacto · 1 pt acierto.
      </p>

      {rivals.length > 0 && (
        <RankingTools shareText={shareText} meName={myName} mePoints={myPoints} rivals={rivals} />
      )}

      {taunt && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--accent)] text-base text-white">😅</span>
          <p className="flex-1 text-sm font-semibold text-[var(--text)]">{taunt}</p>
        </div>
      )}

      {(mvp || donkey) && (
        <div className="card mt-5 grid gap-3 p-4 sm:grid-cols-2">
          {mvp && (
            <div className="flex items-center gap-3 rounded-xl bg-[var(--green-soft)] p-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-white text-xl">🦸</span>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--green)]">MVP del día</div>
                <div className="truncate text-sm font-bold">{mvp.display_name}</div>
                <div className="text-xs font-semibold text-[var(--text-dim)]">+{mvp.delta_points} pts hoy</div>
              </div>
            </div>
          )}
          {donkey && (
            <div className="flex items-center gap-3 rounded-xl bg-[var(--soft)] p-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-white text-xl">🤡</span>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">Paquete del día</div>
                <div className="truncate text-sm font-bold">{donkey.display_name}</div>
                <div className="text-xs font-semibold text-[var(--text-dim)]">+{donkey.delta_points} pts hoy</div>
              </div>
            </div>
          )}
        </div>
      )}

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
              <span className={`flex w-7 flex-col items-center ${isMe ? "text-[var(--accent-deep)]" : "text-[var(--text-dim)]"}`}>
                <span className="font-[family-name:var(--font-display)] text-base font-extrabold">{i + 1}</span>
                {r.prev_rank != null && r.prev_rank !== i + 1 && (
                  r.prev_rank > i + 1 ? (
                    <span className="text-[10px] font-bold text-[var(--green)]">▲{r.prev_rank - (i + 1)}</span>
                  ) : (
                    <span className="text-[10px] font-bold text-[var(--accent)]">▼{(i + 1) - r.prev_rank}</span>
                  )
                )}
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
