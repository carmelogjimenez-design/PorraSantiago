import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Icon from "../components/icons";

export const dynamic = "force-dynamic";

function Row({ label, pts, plus }: { label: string; pts: number; plus?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] py-2.5 first:border-t-0">
      <span className="text-[13px] text-[var(--text)]">{label}</span>
      <span className="flex-none rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-[13px] font-extrabold text-[var(--accent-deep)]">
        {plus ? "+" : ""}{pts} pts
      </span>
    </div>
  );
}

function Section({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="h-5 w-5 text-[var(--accent)]" />
        <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 text-[13px] text-[var(--text-dim)]">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default async function ReglasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
  ]);
  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Reglas</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Así se reparten los puntos. Gana quien más sume al final del Mundial. 🏆
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Section icon="ball" title="Partidos" subtitle="Fase de grupos · la puntuación es acumulativa.">
          <Row label="Aciertas quién gana (o el empate)" pts={3} />
          <Row label="Aciertas además la diferencia de goles" pts={5} />
          <Row label="Clavas el marcador exacto" pts={8} />
        </Section>

        <Section icon="target" title="Goleadores" subtitle="Eliges 3 jugadores para todo el torneo.">
          <Row label="Por cada gol que marque cada elegido" pts={3} />
        </Section>

        <Section icon="grid" title="Orden de grupos" subtitle="Aciertas la posición exacta. Cuenta al cerrarse el grupo.">
          <Row label="1º clasificado correcto" pts={5} />
          <Row label="2º clasificado correcto" pts={5} />
          <Row label="3º clasificado correcto" pts={3} />
          <Row label="4º clasificado correcto" pts={3} />
        </Section>

        <Section icon="trophy" title="Pase a dieciseisavos" subtitle="Acumulable con la posición exacta del grupo.">
          <Row label="Cada equipo que pusiste 1º, 2º o 3º y se clasifica" pts={5} plus />
        </Section>
      </div>

      <div className="card mt-4 p-4 text-[13px] text-[var(--text-dim)]">
        <span className="font-bold text-[var(--text)]">En caso de empate a puntos</span>, manda quien tenga más marcadores exactos. Los pronósticos se bloquean al empezar cada partido. ⏱️
      </div>
    </AppShell>
  );
}
