/**
 * LA PORRA DE SANTIAGO — Motor de puntuación / Scoring engine
 * -----------------------------------------------------------------
 * Funciones PURAS y testeables. Sin dependencias de framework ni de red.
 * PURE, testable functions. No framework / network dependencies.
 *
 * Reglas / Rules:
 *  - Partido: 3 pts resultado exacto, 1 pt ganador/empate, 0 si falla.
 *    Match: 3 pts exact score, 1 pt correct outcome, 0 otherwise.
 *  - Goleadores: 3 pts por cada gol de un jugador elegido.
 *    Scorers: 3 pts per goal scored by a selected player.
 *  - Clasificación de grupo: 10 / 5 / 3 / 4 para 1º / 2º / 3º / 4º.
 *    Group order: 10 / 5 / 3 / 4 for 1st / 2nd / 3rd / 4th.
 *    ⚠️ El 4º vale MÁS que el 3º a propósito: es parte del juego (no es un bug).
 *       4th is worth MORE than 3rd ON PURPOSE: it's part of the game (not a bug).
 */

// ---------- Tipos / Types ----------
export interface Score { home: number; away: number; }

export type MatchPointKind = "exact" | "winner" | "miss";

export interface MatchResult {
  points: number;        // 3 | 1 | 0
  kind: MatchPointKind;
}

// ---------- 1) Puntos por partido / Match points ----------
function outcome(s: Score): "H" | "A" | "D" {
  if (s.home > s.away) return "H";
  if (s.home < s.away) return "A";
  return "D";
}

export function matchPoints(prediction: Score, actual: Score): MatchResult {
  if (prediction.home === actual.home && prediction.away === actual.away) {
    return { points: 3, kind: "exact" };
  }
  if (outcome(prediction) === outcome(actual)) {
    return { points: 1, kind: "winner" };
  }
  return { points: 0, kind: "miss" };
}

// ---------- 2) Puntos por goleadores / Scorer points ----------
export const POINTS_PER_GOAL = 3;

/**
 * @param selectedPlayerIds  Los 3 jugadores elegidos por el usuario.
 * @param goalsByPlayer      Mapa playerId -> nº de goles marcados (fase de grupos).
 * @returns puntos totales por goleadores.
 */
export function scorerPoints(
  selectedPlayerIds: string[],
  goalsByPlayer: Record<string, number>
): number {
  return selectedPlayerIds.reduce((sum, pid) => {
    const goals = goalsByPlayer[pid] ?? 0;
    return sum + goals * POINTS_PER_GOAL;
  }, 0);
}

// ---------- 3) Puntos por clasificación de grupo / Group order points ----------
// Índice 0 = 1º, índice 3 = 4º.  Mantener exactamente este orden.
export const GROUP_RANK_POINTS = [10, 5, 3, 4] as const;

/**
 * @param predictedOrder  Array de 4 teamId en el orden pronosticado (1º..4º).
 * @param actualOrder     Array de 4 teamId en el orden real final (1º..4º).
 * @returns puntos del grupo: suma de aciertos por posición exacta.
 */
export function groupClassificationPoints(
  predictedOrder: string[],
  actualOrder: string[]
): number {
  let points = 0;
  for (let pos = 0; pos < 4; pos++) {
    if (predictedOrder[pos] && predictedOrder[pos] === actualOrder[pos]) {
      points += GROUP_RANK_POINTS[pos];
    }
  }
  return points;
}

// ---------- 4) Recalcular ranking / Recompute leaderboard row ----------
export interface LeaderboardBreakdown {
  pts_exact: number;
  pts_winner: number;
  pts_scorers: number;
  pts_groups: number;
  total: number;
}

export interface UserScoringInput {
  matchResults: MatchResult[];      // resultados ya calculados de sus partidos
  scorerPts: number;                // de scorerPoints()
  groupPts: number[];               // un valor por grupo pronosticado
}

export function buildLeaderboardRow(input: UserScoringInput): LeaderboardBreakdown {
  const pts_exact  = input.matchResults
    .filter(r => r.kind === "exact")
    .reduce((s, r) => s + r.points, 0);
  const pts_winner = input.matchResults
    .filter(r => r.kind === "winner")
    .reduce((s, r) => s + r.points, 0);
  const pts_scorers = input.scorerPts;
  const pts_groups  = input.groupPts.reduce((s, p) => s + p, 0);
  return {
    pts_exact,
    pts_winner,
    pts_scorers,
    pts_groups,
    total: pts_exact + pts_winner + pts_scorers + pts_groups,
  };
}

// ---------- Tests rápidos (ejecuta con: npx tsx scoring.ts) ----------
// Quick smoke tests (run with: npx tsx scoring.ts)
if (typeof require !== "undefined" && require.main === module) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error("❌ " + msg);
    console.log("✅ " + msg);
  };

  assert(matchPoints({home:2,away:1},{home:2,away:1}).points === 3, "exacto = 3");
  assert(matchPoints({home:3,away:0},{home:2,away:1}).points === 1, "ganador = 1");
  assert(matchPoints({home:0,away:2},{home:1,away:0}).points === 0, "fallo = 0");
  assert(matchPoints({home:1,away:1},{home:2,away:2}).points === 1, "empate distinto = 1");

  assert(scorerPoints(["a","b","c"], {a:2,b:1}) === 9, "goleadores 3 goles = 9");

  // Acierta 1º y 4º => 10 + 4 = 14
  assert(
    groupClassificationPoints(["t1","tx","ty","t4"], ["t1","t2","t3","t4"]) === 14,
    "grupo 1º+4º = 14 (el 4º vale 4, a propósito)"
  );

  console.log("\nTodos los tests OK / All tests passed");
}
