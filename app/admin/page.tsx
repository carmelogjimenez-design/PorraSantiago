import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "../components/app-shell";
import SyncButton from "./sync-button";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-dim)]">{label}</div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{value}</div>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("display_name,role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const [playersRes, paidRes, logRes, ptsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("has_paid", true),
    admin.from("api_sync_logs").select("status,finished_at,error").order("finished_at", { ascending: false }).limit(1),
    supabase.rpc("get_my_points"),
  ]);

  const players = playersRes.count ?? 0;
  const paid = paidRes.count ?? 0;
  const last = ((logRes.data ?? []) as Array<{ status?: string; finished_at?: string; error?: string }>)[0];
  const lastWhen = last?.finished_at
    ? new Date(last.finished_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";
  const points = Number(ptsRes.data ?? 0);

  return (
    <AppShell userName={me?.display_name ?? "Admin"} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Panel de admin 🛠️</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">Control en directo de la porra. Solo tú ves esto.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Jugadores" value={players} />
        <Stat label="Han pagado" value={paid} />
        <Stat label="Bote" value={`${paid * 10}€`} />
      </div>

      <div className="card mt-4 p-4 sm:p-5">
        <div className="text-[12px] font-extrabold uppercase tracking-[0.08em]">Sincronización</div>
        <p className="mt-1 text-[13px] text-[var(--text-dim)]">
          Fuerza una actualización ya (resultados, clasificación y goleadores), sin esperar al sync automático.
        </p>
        <SyncButton />
        <p className="mt-3 text-[12px] text-[var(--text-dim)]">
          Último sync: <span className="font-bold text-[var(--text)]">{last?.status === "ok" ? "correcto ✅" : last?.status === "error" ? "con error ❌" : "—"}</span> · {lastWhen}
        </p>
      </div>

      <div className="card mt-4 p-4 text-[13px] text-[var(--text-dim)]">
        🔜 Próximamente aquí: <span className="font-bold text-[var(--text)]">editar resultados a mano</span> y <span className="font-bold text-[var(--text)]">ajustar goles de goleadores</span> — tu red de seguridad si la API falla.
      </div>
    </AppShell>
  );
}
