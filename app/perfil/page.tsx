import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, favorite_country, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <Link
        href="/dashboard"
        className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)] transition hover:text-[var(--text)]"
      >
        ← Volver
      </Link>
      <h1 className="mt-3 mb-7 text-3xl uppercase font-[family-name:var(--font-display)]">
        Tu perfil
      </h1>

      <div className="card rise p-6 sm:p-8">
        <ProfileForm
          initial={{
            display_name: profile?.display_name ?? "",
            favorite_country: profile?.favorite_country ?? "",
            avatar_url: profile?.avatar_url ?? "",
          }}
        />
      </div>
    </main>
  );
}
