"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "../components/avatar";

export default function AvatarUploader({
  userId, initialUrl, name,
}: { userId: string; initialUrl: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    if (!file.type.startsWith("image/")) { setMsg("Elige una imagen / Pick an image"); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("Máx 5 MB"); return; }

    setPending(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (up.error) { setMsg(up.error.message); setPending(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const upd = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (upd.error) { setMsg(upd.error.message); setPending(false); return; }
      setUrl(publicUrl);
      setMsg("✓ Foto actualizada");
    } catch {
      setMsg("No se pudo subir, inténtalo de nuevo");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar src={url} name={name} className="h-24 w-24" textClass="text-3xl" />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <button onClick={() => fileRef.current?.click()} disabled={pending}
        className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-50">
        {pending ? "Subiendo…" : url ? "Cambiar foto" : "Subir foto"}
      </button>
      {msg && <p className="text-xs font-bold text-[var(--text-dim)]">{msg}</p>}
    </div>
  );
}
