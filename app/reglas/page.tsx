import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";

export const dynamic = "force-dynamic";

const RULES = [
  { icon: "🎯", t: "Resultado exacto", d: "Si aciertas el marcador exacto de un partido: 3 puntos." },
  { icon: "✅", t: "Ganador o empate", d: "Si solo aciertas quién gana (o el empate), pero no el marcador: 1 punto." },
  { icon: "❌", t: "Fallo", d: "Si fallas el resultado: 0 puntos." },
  { icon: "🔒", t: "Bloqueo", d: "Puedes editar tu pronóstico hasta el pitido inicial. Al empezar el partido se bloquea." },
  { icon: "👑", t: "Orden de grupos", d: "Predecir cómo queda cada grupo dará puntos extra (próximamente)." },
  { icon: "⚽", t: "Goleadores", d: "Elige 3 goleadores: 3 puntos por cada gol que marquen (próximamente)." },
];

export default async function ReglasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [p, pts] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("predictions").select("points").eq("user_id", user.id),
  ]);
  const name = p.data?.display_name ?? "Jugador";
  const points = (pts.data ?? []).reduce((a, r: { points: number | null }) => a + (r.points ?? 0), 0);

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Reglas</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">Cómo se puntúa en La Porra de Santiago.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {RULES.map((r) => (
          <div key={r.t} className="card flex gap-3 p-4">
            <span className="text-2xl leading-none">{r.icon}</span>
            <div>
              <div className="font-bold">{r.t}</div>
              <div className="text-sm text-[var(--text-dim)]">{r.d}</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
