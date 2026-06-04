import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Icon from "../components/icons";

export const dynamic = "force-dynamic";

type LbRow = { user_id: string; display_name: string; total_points: number | string };

export default async function PremiosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, paidRes, lbRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.rpc("get_paid_count"),
    supabase.rpc("get_leaderboard"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const n = Number(paidRes.data ?? 0);
  const bote = 10 * n;

  const lb = ((lbRes.data ?? []) as LbRow[]).map((r) => ({ ...r, total_points: Number(r.total_points) }));
  const top = lb[0];
  const fase1Leader = top && top.total_points > 0 ? top.display_name : "Por decidir";

  const prizes = [
    { icon: "target", label: "Goleadores", amount: 2 * n, winner: "Por decidir", note: "Quien más acierte con sus 3 goleadores." },
    { icon: "ball", label: "Fase de grupos", amount: 3 * n, winner: fase1Leader, note: "Líder al acabar la fase de grupos." },
    { icon: "trophy", label: "Fase final", amount: 5 * n, winner: "Por decidir", note: "Campeón de la porra al acabar el Mundial." },
  ];

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Premios</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Cada jugador aporta <b className="text-[var(--text)]">10€</b> con su Bizum. El bote se reparte así: 2€ goleadores · 3€ fase de grupos · 5€ fase final.
      </p>

      {/* Bote total */}
      <div className="card mt-5 overflow-hidden p-0">
        <div className="bg-[var(--accent)] p-6 text-center text-white">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] opacity-90">Bote total</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none">{bote}€</div>
          <div className="mt-2 text-sm font-bold opacity-90">
            {n} {n === 1 ? "jugador ha" : "jugadores han"} entrado · 10€ cada uno
          </div>
        </div>
        {n === 0 && (
          <div className="p-4 text-center text-[13px] font-semibold text-[var(--text-dim)]">
            El bote se llena según la gente vaya haciendo el Bizum. 💸
          </div>
        )}
      </div>

      {/* Premios */}
      <div className="mt-6 space-y-3">
        {prizes.map((p) => (
          <div key={p.label} className="card flex items-center gap-4 p-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name={p.icon} className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-wide">{p.label}</div>
              <div className="mt-0.5 text-[13px] text-[var(--text-dim)]">{p.note}</div>
              <div className="mt-1 text-[13px] font-bold">
                Ganador: <span className={p.winner === "Por decidir" ? "text-[var(--text-dim)]" : "text-[var(--accent)]"}>{p.winner}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold">{p.amount}€</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] text-[var(--text-dim)]">
        Los importes se actualizan solos según cuántos jugadores hayan hecho el Bizum.
      </p>
    </AppShell>
  );
}
