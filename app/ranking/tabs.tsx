"use client";

import { useState } from "react";

export default function RankingTabs({ grupos, faseFinal }: { grupos: React.ReactNode; faseFinal: React.ReactNode }) {
  const [tab, setTab] = useState<"grupos" | "final">("grupos");
  return (
    <>
      <div className="mt-4 flex gap-2 rounded-2xl bg-[var(--soft)] p-1">
        <button onClick={() => setTab("grupos")}
          className={`flex-1 rounded-xl px-3 py-2 text-[13px] font-extrabold transition ${
            tab === "grupos" ? "bg-white text-[var(--text)] shadow-sm" : "text-[var(--text-dim)]"
          }`}>
          ⚽ Primera ronda
        </button>
        <button onClick={() => setTab("final")}
          className={`flex-1 rounded-xl px-3 py-2 text-[13px] font-extrabold transition ${
            tab === "final" ? "bg-white text-[var(--text)] shadow-sm" : "text-[var(--text-dim)]"
          }`}>
          🏆 Fase final
        </button>
      </div>
      <div className={tab === "grupos" ? "" : "hidden"}>{grupos}</div>
      <div className={tab === "final" ? "" : "hidden"}>{faseFinal}</div>
    </>
  );
}
