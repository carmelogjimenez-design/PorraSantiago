"use client";

import { useState } from "react";
import PredictionsBoard, { type MatchVM, type PredVM } from "./board";
import BracketView, { type BracketPlayer, type TeamLite } from "./bracket-view";

function Locked({ title, text }: { title: string; text: string }) {
  return (
    <div className="card mt-5 p-8 text-center">
      <div className="text-4xl">🔒</div>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg font-extrabold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-dim)]">{text}</p>
    </div>
  );
}

export default function PronosticosTabs({
  matches, predsByMatch, isAdmin, matchesUnlocked,
  players, teamById, bracketUnlocked,
}: {
  matches: MatchVM[];
  predsByMatch: Record<string, PredVM[]>;
  isAdmin: boolean;
  matchesUnlocked: boolean;
  players: BracketPlayer[];
  teamById: Record<string, TeamLite>;
  bracketUnlocked: boolean;
}) {
  const [tab, setTab] = useState<"partidos" | "cuadros">("cuadros");

  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <button onClick={() => setTab("cuadros")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${tab === "cuadros" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--soft)]"}`}>
          🗺️ Cuadros
        </button>
        <button onClick={() => setTab("partidos")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${tab === "partidos" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--soft)]"}`}>
          ⚽ Partidos
        </button>
      </div>

      {tab === "cuadros" ? (
        bracketUnlocked ? (
          <BracketView players={players} teamById={teamById} />
        ) : (
          <Locked title="Se destapa con el primer dieciseisavos"
            text="Para que nadie copie, los cuadros de la peña se ven cuando arranque el primer partido de la fase final. Hasta entonces, secreto. 🤫" />
        )
      ) : (
        matchesUnlocked ? (
          <PredictionsBoard matches={matches} predsByMatch={predsByMatch} isAdmin={isAdmin} />
        ) : (
          <Locked title="Se destapa con el primer pitido"
            text="Los pronósticos partido a partido se ven cuando arranca cada partido. 🤫" />
        )
      )}
    </div>
  );
}
