"use client";

import { useState } from "react";
import { forceSync } from "./actions";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await forceSync();
      if (r?.ok) {
        setMsg(`✅ Listo · equipos ${r.teams ?? 0} · partidos ${r.matches ?? 0} · goleadores ${r.scorers ?? 0}`);
      } else {
        setMsg(`❌ ${r?.error || "Error en el sync"}`);
      }
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={run}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[var(--accent-deep)] active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Sincronizando…" : "🔄 Sincronizar ahora"}
      </button>
      {msg && <p className="mt-2 text-[13px] font-semibold text-[var(--text-dim)]">{msg}</p>}
    </div>
  );
}
