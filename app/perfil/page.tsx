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
    supabase.from("profiles").select("display_name,avatar_url,favorite_country").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const avatar = profileRes.data?.avatar_url ?? null;
  const country = profileRes.data?.favorite_country ?? null;
  const points = Number(myPtsRes.data ?? 0);

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
