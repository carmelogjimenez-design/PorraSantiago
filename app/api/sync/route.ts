import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://api.football-data.org/v4";
const COMP = "WC"; // FIFA World Cup

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN ?? "" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data ${path} -> HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

function statusMap(s: string): "scheduled" | "live" | "finished" | "postponed" {
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "FINISHED") return "finished";
  if (["POSTPONED", "SUSPENDED", "CANCELLED", "CANCELED"].includes(s)) return "postponed";
  return "scheduled";
}

function groupLetter(raw: string): string {
  return String(raw || "").trim().slice(-1).toUpperCase(); // "GROUP_A" -> "A"
}

// --- Cruce de goleadores por tokens compartidos del nombre ---
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Partículas/sufijos que NO sirven para identificar (apellidos compuestos, "Jr", etc.)
const STOP = new Set([
  "jr", "junior", "sr", "ii", "iii", "iv", "neto", "filho",
  "de", "da", "do", "dos", "das", "del", "della", "di", "den",
  "van", "von", "der", "el", "al", "bin", "ben", "la", "le",
]);

// Tokens significativos: len>=3 y no partícula
function sigTokens(name: string): string[] {
  return norm(name).split(" ").filter((t) => t.length >= 3 && !STOP.has(t));
}

function matchScorer(
  scorerName: string,
  candidates: Array<{ id: string; full_name: string }>
): { id: string } | null {
  const sAll = norm(scorerName).split(" ").filter(Boolean);
  const sSig = sigTokens(scorerName);
  const sSet = new Set<string>(sSig.length ? sSig : sAll); // fallback si no hay significativos
  if (!sSet.size) return null;

  const sArr = [...sSet];
  let best: { id: string } | null = null;
  let bestScore = -1;

  // ¿coincide el token de la camiseta con alguno del goleador?
  // exacto, o por prefijo (>=3 letras): "vini" ~ "vinicius", "gabi" ~ "gabriel"
  const tokenHit = (t: string): number => {
    if (sSet.has(t)) return t.length + 2; // match exacto: mejor
    for (const st of sArr) {
      if (st.length >= 3 && t.length >= 3 && (st.startsWith(t) || t.startsWith(st))) {
        return Math.min(st.length, t.length); // match por prefijo
      }
    }
    return 0;
  };

  for (const c of candidates) {
    const cAll = norm(c.full_name).split(" ").filter(Boolean);
    const cSig = sigTokens(c.full_name);
    const cTokens = cSig.length ? cSig : cAll;

    // tokens de la camiseta que encajan con el nombre del goleador (exacto o prefijo)
    let shared = 0;
    let sharedLen = 0;
    for (const t of cTokens) {
      const h = tokenHit(t);
      if (h > 0) { shared++; sharedLen += h; }
    }
    if (shared === 0) continue; // sin ningún token en común -> no es

    let score = shared * 100 + sharedLen;

    // bonus si la inicial de la camiseta ("L. Martinez") coincide con el nombre del goleador
    const initial = cAll.find((t) => t.length === 1) || null;
    if (initial && sAll[0] && sAll[0][0] === initial) score += 5;

    if (score > bestScore) { bestScore = score; best = { id: c.id }; }
  }
  return best;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const manualOk = searchParams.get("secret") === process.env.SYNC_SECRET;
  const cronOk = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!manualOk && !cronOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const summary: Record<string, number> = { teams: 0, standings: 0, matches: 0, ko: 0, snapshot: 0, scorers: 0, advanced: 0 };

  try {
    const { data: groupsRows } = await supabase.from("groups").select("id,label");
    const groupIdByLabel = new Map<string, number>(
      (groupsRows ?? []).map((g: { label: string; id: number }) => [g.label, g.id])
    );

    // STANDINGS -> equipos + grupo
    const sData = await apiGet(`/competitions/${COMP}/standings`);
    const blocks = ((sData.standings ?? []) as Array<Record<string, unknown>>).filter(
      (b) => b.type === "TOTAL"
    );

    const teamUpserts: Record<string, unknown>[] = [];
    for (const block of blocks) {
      const label = groupLetter(block.group as string);
      const table = (block.table ?? []) as Array<Record<string, unknown>>;
      for (const row of table) {
        const team = row.team as { id: number; name: string; crest: string };
        teamUpserts.push({
          api_team_id: team.id,
          name: team.name,
          flag_url: team.crest,
          group_id: groupIdByLabel.get(label) ?? null,
        });
      }
    }
    if (teamUpserts.length) {
      const { error } = await supabase.from("teams").upsert(teamUpserts, { onConflict: "api_team_id" });
      if (error) throw new Error("teams upsert: " + error.message);
    }
    summary.teams = teamUpserts.length;

    const { data: teamRows } = await supabase.from("teams").select("id,api_team_id,group_id");
    const teamByApi = new Map<number, { id: string; group_id: number | null }>(
      (teamRows ?? []).map((t: { id: string; api_team_id: number; group_id: number | null }) => [
        t.api_team_id, { id: t.id, group_id: t.group_id },
      ])
    );

    // STANDINGS rows
    const standingUpserts: Record<string, unknown>[] = [];
    for (const block of blocks) {
      const label = groupLetter(block.group as string);
      const group_id = groupIdByLabel.get(label);
      const table = (block.table ?? []) as Array<Record<string, unknown>>;
      for (const row of table) {
        const team = row.team as { id: number };
        const mapped = teamByApi.get(team.id);
        if (!group_id || !mapped) continue;
        standingUpserts.push({
          group_id, team_id: mapped.id,
          played: (row.playedGames as number) ?? 0,
          won: (row.won as number) ?? 0,
          drawn: (row.draw as number) ?? 0,
          lost: (row.lost as number) ?? 0,
          gf: (row.goalsFor as number) ?? 0,
          ga: (row.goalsAgainst as number) ?? 0,
          points: (row.points as number) ?? 0,
          rank: (row.position as number) ?? null,
        });
      }
    }
    if (standingUpserts.length) {
      await supabase.from("standings").upsert(standingUpserts, { onConflict: "group_id,team_id" });
    }
    summary.standings = standingUpserts.length;

    // MATCHES (solo fase de grupos)
    // No pisar los partidos editados a mano desde el panel de admin
    const { data: lockedRows } = await supabase
      .from("matches").select("api_fixture_id").eq("manual_override", true);
    const lockedSet = new Set(
      ((lockedRows ?? []) as Array<{ api_fixture_id: string }>).map((r) => r.api_fixture_id)
    );
    const mData = await apiGet(`/competitions/${COMP}/matches`);
    const matchUpserts: Record<string, unknown>[] = [];
    for (const m of (mData.matches ?? []) as Array<Record<string, unknown>>) {
      if (m.stage !== "GROUP_STAGE") continue;
      if (lockedSet.has(String(m.id))) continue; // editado a mano: no tocar
      const homeT = m.homeTeam as { id: number };
      const awayT = m.awayTeam as { id: number };
      const home = teamByApi.get(homeT?.id);
      const away = teamByApi.get(awayT?.id);
      if (!home || !away) continue;
      const score = m.score as { fullTime?: { home: number | null; away: number | null } };
      const label = groupLetter((m.group as string) || "");
      matchUpserts.push({
        api_fixture_id: String(m.id),
        group_id: groupIdByLabel.get(label) ?? home.group_id,
        home_team_id: home.id,
        away_team_id: away.id,
        kickoff_at: m.utcDate,
        stadium: (m.venue as string) ?? null,
        status: statusMap((m.status as string) ?? "SCHEDULED"),
        home_score: score?.fullTime?.home ?? null,
        away_score: score?.fullTime?.away ?? null,
        updated_at: new Date().toISOString(),
      });
    }
    if (matchUpserts.length) {
      const { error } = await supabase.from("matches").upsert(matchUpserts, { onConflict: "api_fixture_id" });
      if (error) throw new Error("matches upsert: " + error.message);
    }
    summary.matches = matchUpserts.length;

    // ===================================================================
    // KO MATCHES (FASE FINAL) -> engancha resultados de eliminatoria a TUS
    // partidos manuales (R32, R16, QF, SF, FIN).
    // - Se emparejan por los DOS equipos (no por api_fixture_id: el tuyo es
    //   9001+ y NO coincide con el ID real de la API).
    // - El cruce es por PAREJA (sin importar quién es local): si la API tiene
    //   el partido con home/away al revés que tu ficha, se ALINEA el marcador
    //   a TU orientación para no asignar los goles cambiados.
    // - Marcador = resultado final INCLUIDA PRÓRROGA (Football-Data lo da en
    //   score.fullTime; los penaltis no suman goles, así que no cuentan aquí).
    // - Respeta manual_override (si lo editaste a mano, no se toca).
    // ===================================================================
    try {
      const { data: koLocal } = await supabase
        .from("matches")
        .select("id,home_team_id,away_team_id,round,manual_override")
        .not("round", "is", null);

      const pairKey = (a: string, b: string) => [a, b].sort().join("|");
      const koByPair = new Map<
        string,
        { id: string; home_team_id: string; away_team_id: string; manual_override: boolean }
      >();
      for (const r of (koLocal ?? []) as Array<{
        id: string; home_team_id: string | null; away_team_id: string | null;
        round: string | null; manual_override: boolean | null;
      }>) {
        if (!r.home_team_id || !r.away_team_id) continue;
        koByPair.set(pairKey(r.home_team_id, r.away_team_id), {
          id: r.id,
          home_team_id: r.home_team_id,
          away_team_id: r.away_team_id,
          manual_override: !!r.manual_override,
        });
      }

      let koUpdated = 0;
      if (koByPair.size) {
        for (const m of (mData.matches ?? []) as Array<Record<string, unknown>>) {
          if (!m.stage || m.stage === "GROUP_STAGE") continue; // solo eliminatorias
          const homeT = m.homeTeam as { id?: number };
          const awayT = m.awayTeam as { id?: number };
          const home = homeT?.id ? teamByApi.get(homeT.id) : undefined;
          const away = awayT?.id ? teamByApi.get(awayT.id) : undefined;
          if (!home || !away) continue; // aún sin equipos definidos ("Winner ...")

          const fixture = koByPair.get(pairKey(home.id, away.id));
          if (!fixture) continue;            // ese cruce no está en tus partidos KO
          if (fixture.manual_override) continue; // editado a mano: no tocar

          const st = statusMap((m.status as string) ?? "SCHEDULED");
          const score = m.score as { fullTime?: { home: number | null; away: number | null } };
          const ftH = score?.fullTime?.home ?? null;
          const ftA = score?.fullTime?.away ?? null;

          // aún no jugado (sin marcador y no en juego) -> no escribimos nada
          if (st === "scheduled" && ftH == null && ftA == null) continue;

          // alinear el marcador a TU orientación (home/away de tu ficha)
          let hs: number | null;
          let as_: number | null;
          if (home.id === fixture.home_team_id) { hs = ftH; as_ = ftA; }
          else { hs = ftA; as_ = ftH; } // la API lo tiene al revés que tu ficha

          let done = false;
          for (let attempt = 0; attempt < 3 && !done; attempt++) {
            const { error } = await supabase
              .from("matches")
              .update({ home_score: hs, away_score: as_, status: st, updated_at: new Date().toISOString() })
              .eq("id", fixture.id);
            if (!error) { done = true; koUpdated++; }
            else { await new Promise((r) => setTimeout(r, 250 * (attempt + 1))); }
          }
        }
      }
      summary.ko = koUpdated;
    } catch {
      summary.ko = -1; // si algo falla aquí, no rompe el resto del sync
    }

    // ===================================================================
    // FOTO DE GOLES AL ARRANCAR LA FASE FINAL (players.goals_at_ko)
    // -------------------------------------------------------------------
    // Para que en la clasificación de FASE FINAL los goleadores sumen SOLO
    // por los goles de la eliminatoria (no por los de grupos, que ya
    // puntuaron), guardamos una FOTO del 'goals' de cada jugador justo
    // cuando arranca el 1er dieciseisavos. Luego: goles_KO = goals - goals_at_ko.
    //
    // Se hace UNA sola vez: solo se fotografía a quien aún tiene goals_at_ko
    // NULL, y solo si la fase final ya ha empezado (hay un KO con su hora
    // ya pasada). En sucesivos syncs no se vuelve a tocar.
    // ===================================================================
    try {
      // ¿ha arrancado ya la fase final?
      const nowIso = new Date().toISOString();
      const { count: koLiveCount } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .not("round", "is", null)
        .lte("kickoff_at", nowIso);

      if ((koLiveCount ?? 0) > 0) {
        // jugadores aún sin foto (goals_at_ko NULL), en dos tandas por el tope de 1000
        const [snap1, snap2] = await Promise.all([
          supabase.from("players").select("id,goals").is("goals_at_ko", null).range(0, 999),
          supabase.from("players").select("id,goals").is("goals_at_ko", null).range(1000, 1999),
        ]);
        const toSnap = [...(snap1.data ?? []), ...(snap2.data ?? [])] as Array<{ id: string; goals: number | null }>;

        let snapped = 0;
        const sleepS = (ms: number) => new Promise((r) => setTimeout(r, ms));
        for (const pl of toSnap) {
          let done = false;
          for (let attempt = 0; attempt < 3 && !done; attempt++) {
            const { error } = await supabase
              .from("players")
              .update({ goals_at_ko: pl.goals ?? 0 })
              .eq("id", pl.id)
              .is("goals_at_ko", null); // por si otro sync ya la puso en paralelo
            if (!error) { done = true; snapped++; }
            else { await sleepS(250 * (attempt + 1)); }
          }
        }
        summary.snapshot = snapped; // nº de fotos tomadas (0 si ya estaban todas)
      }
    } catch {
      summary.snapshot = -1; // no rompe el resto del sync
    }

    // CLASIFICADOS -> teams.advanced (equipos que aparecen en cualquier eliminatoria)
    const advancedApi = new Set<number>();
    for (const m of (mData.matches ?? []) as Array<Record<string, unknown>>) {
      if (m.stage && m.stage !== "GROUP_STAGE") {
        const h = (m.homeTeam as { id?: number })?.id;
        const a = (m.awayTeam as { id?: number })?.id;
        if (h) advancedApi.add(h);
        if (a) advancedApi.add(a);
      }
    }
    if (advancedApi.size) {
      await supabase.from("teams").update({ advanced: true }).in("api_team_id", [...advancedApi]);
    }
    summary.advanced = advancedApi.size;

    // PRÓXIMA FASE: primer partido de eliminatorias (para el countdown de "Fase final")
    const koDates = ((mData.matches ?? []) as Array<Record<string, unknown>>)
      .filter((m) => m.stage && m.stage !== "GROUP_STAGE" && m.utcDate)
      .map((m) => String(m.utcDate))
      .sort();
    if (koDates.length) {
      try { await supabase.from("tournament_config").update({ knockout_starts_at: koDates[0] }).eq("id", 1); } catch { /* no rompe el sync */ }
    }

    // SCORERS -> players.goals (cruce por tokens; respeta goals_override)
    try {
      const scData = await apiGet(`/competitions/${COMP}/scorers?limit=100`);
      const scorers = (scData.scorers ?? []) as Array<Record<string, unknown>>;

      // cargar todos los jugadores (en dos tandas por el límite de 1000)
      const [pp1, pp2] = await Promise.all([
        supabase.from("players").select("id,full_name,team_id,goals").range(0, 999),
        supabase.from("players").select("id,full_name,team_id,goals").range(1000, 1999),
      ]);
      const allPlayers = [...(pp1.data ?? []), ...(pp2.data ?? [])] as Array<{ id: string; full_name: string; team_id: string; goals: number | null }>;
      const byTeam = new Map<string, Array<{ id: string; full_name: string }>>();
      const goalsNow = new Map<string, number>();
      for (const p of allPlayers) {
        const arr = byTeam.get(p.team_id) ?? [];
        arr.push({ id: p.id, full_name: p.full_name });
        byTeam.set(p.team_id, arr);
        goalsNow.set(p.id, p.goals ?? 0);
      }

      // 1) Calcular el goleador objetivo de cada jugador (sin escribir todavía)
      const target = new Map<string, number>(); // player_id -> goles según la API
      const used = new Set<string>(); // evita asignar el mismo jugador 2 veces
      for (const s of scorers) {
        const team = s.team as { id: number } | undefined;
        const player = s.player as { name: string } | undefined;
        const goals = (s.goals as number) ?? (s.numberOfGoals as number) ?? 0;
        if (!team || !player || !goals) continue;
        const mapped = teamByApi.get(team.id);
        if (!mapped) continue;
        const cand = (byTeam.get(mapped.id) ?? []).filter((c) => !used.has(c.id));
        const hit = matchScorer(player.name, cand);
        if (hit) { target.set(hit.id, goals); used.add(hit.id); }
      }

      // 2) Escribir SOLO lo que cambia (diff), en serie y con reintento ante rate limit.
      //    No tocamos goals_override (el manual). Y solo ponemos a 0 a quien ANTES
      //    tenía goles y ahora ya no aparece como goleador -> nada de "borrón global".
      const writes: Array<{ id: string; goals: number }> = [];
      for (const [id, g] of target) {
        if ((goalsNow.get(id) ?? 0) !== g) writes.push({ id, goals: g });
      }
      for (const [id, prev] of goalsNow) {
        if (prev > 0 && !target.has(id)) writes.push({ id, goals: 0 }); // ya no es goleador
      }

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let okCount = 0;
      let failCount = 0;
      for (const w of writes) {
        let done = false;
        for (let attempt = 0; attempt < 3 && !done; attempt++) {
          const { error } = await supabase.from("players").update({ goals: w.goals }).eq("id", w.id);
          if (!error) { done = true; okCount++; }
          else { await sleep(250 * (attempt + 1)); } // backoff: 250ms, 500ms, 750ms
        }
        if (!done) failCount++;
      }
      // Si quedó algún fallo, marcamos scorers como negativo para verlo en el log
      summary.scorers = failCount > 0 ? -failCount : okCount;
    } catch (scErr) {
      // si /scorers falla (p.ej. aún sin datos), no rompemos el resto del sync
      summary.scorers = -1;
    }

    // Foto del ranking (para flechas ↑↓ y MVP/Paquete del día)
    try { await supabase.rpc("save_ranking_snapshot"); } catch { /* no rompe el sync */ }

    await supabase.from("api_sync_logs").insert({
      source: "football-data", endpoint: "/standings + /matches + /ko + /scorers", status: "ok",
      rows_upserted: summary.teams + summary.matches + (summary.ko > 0 ? summary.ko : 0) + summary.scorers, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("api_sync_logs").insert({
      source: "football-data", endpoint: "/standings + /matches + /ko + /scorers", status: "error",
      error: message, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
