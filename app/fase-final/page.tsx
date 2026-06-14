import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import KnockoutCountdown from "./countdown";
export const dynamic = "force-dynamic";

export default async function FaseFinalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profileRes, myPtsRes, cfgRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("tournament_config").select("knockout_starts_at").eq("id", 1).maybeSingle(),
  ]);
  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const koStart: string | null = cfgRes.data?.knockout_starts_at ?? null;
  const whenLabel = koStart
    ? new Date(koStart).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;

  const rules: { icon: string; t: string; d: string }[] = [
    { icon: "🗓️", t: "Ronda a ronda", d: "Cada ronda se abre al terminar la anterior (dieciseisavos → octavos → cuartos → semis → final) y se bloquea al primer pitido." },
    { icon: "🎯", t: "Cómo se puntúa", d: "+1 por acertar quién pasa y +3 si clavas el resultado exacto. Todo suma al ranking global." },
    { icon: "⚽", t: "Tus goleadores", d: "Al acabar los grupos eliges 3 de tus 12 goleadores; se mantienen aunque su equipo quede eliminado. 3 pts por gol." },
    { icon: "🏆", t: "El premio", d: "Campeón de la porra al acabar el Mundial. Si hay empate, se reparte el bote." },
  ];

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Fase final 🏆</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">La eliminatoria a vida o muerte. Se desbloquea al acabar la fase de grupos.</p>

      <div className="card mt-5 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-white via-[#FFF4F7] to-[#FFE7EE] p-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
            🔒 Próximamente
          </div>
          <div className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">Se activa en</div>
          <KnockoutCountdown target={koStart} whenLabel={whenLabel} />
          <p className="mx-auto mt-3 max-w-sm text-[13px] text-[var(--text-dim)]">
            Cuenta atrás al primer partido de dieciseisavos. Cuando arranque, podrás pronosticar la eliminatoria y elegir tus 3 goleadores.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {rules.map((r) => (
          <div key={r.t} className="card flex items-start gap-4 p-4">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[var(--accent-soft)] text-xl">{r.icon}</span>
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-display)] text-base font-extrabold">{r.t}</div>
              <div className="mt-0.5 text-[13px] text-[var(--text-dim)]">{r.d}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] text-[var(--text-dim)]">
        Las reglas pueden ajustarse antes de que arranque la fase final.
      </p>
    </AppShell>
  );
}
