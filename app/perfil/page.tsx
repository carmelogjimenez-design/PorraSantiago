import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import AvatarUploader from "./avatar-uploader";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes] = await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,favorite_country,role").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const avatar = profileRes.data?.avatar_url ?? null;
  const country = profileRes.data?.favorite_country ?? null;
  const points = Number(myPtsRes.data ?? 0);
  const isAdmin = profileRes.data?.role === "admin";

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Tu perfil</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">Tu foto aparecerá en el ranking junto a tu nombre.</p>

      <div className="card mt-5 flex flex-col items-center gap-5 p-6">
        <AvatarUploader userId={user.id} initialUrl={avatar} name={name} />

        <div className="w-full max-w-sm space-y-2.5 border-t border-[var(--border)] pt-5">
          <Row label="Nombre" value={name} />
          <Row label="Email" value={user.email ?? "—"} />
          {country && <Row label="Selección favorita" value={country} />}
          <Row label="Puntos" value={`${points} pts`} />
        </div>
      </div>

      {isAdmin && (
        <a
          href="/admin"
          className="card mt-4 flex items-center justify-between gap-3 p-4 transition hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--accent-soft)] text-xl">🛠️</span>
            <div>
              <div className="text-sm font-extrabold">Panel de admin</div>
              <div className="text-[13px] text-[var(--text-dim)]">Control en directo: sync, resultados y goles.</div>
            </div>
          </div>
          <span className="text-lg font-bold text-[var(--text-dim)]">→</span>
        </a>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-bold text-[var(--text-dim)]">{label}</span>
      <span className="truncate text-sm font-bold">{value}</span>
    </div>
  );
}
