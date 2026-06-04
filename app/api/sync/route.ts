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

// --- Cruce aproximado de goleadores por apellido (+ inicial para desempatar) ---
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchScorer(
  scorerName: string,
  candidates: Array<{ id: string; full_name: string }>
): { id: string } | null {
  const sTokens = norm(scorerName).split(" ").filter(Boolean);
  if (!sTokens.length) return null;
  let best: { id: string } | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    const tokens = norm(c.full_name).split(" ").filter(Boolean);
    const significant = tokens.filter((t) => t.length > 1);
    if (!significant.length) continue;
    const surname = significant[significant.length - 1]; // apellido de la camiseta
    if (!sTokens.includes(surname)) continue; // el apellido debe aparecer en el nombre del goleador
    let score = surname.length;
    const initial = tokens.find((t) => t.length === 1) || null; // p.ej. "l" en "l. martinez"
    if (initial) {
      if (sTokens[0] && sTokens[0][0] === initial) score += 5; // inicial coincide -> probable
      else score -= 3; // inicial distinta -> penaliza
    }
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
  const summary: Record<string, number> = { teams: 0, standings: 0, matches: 0, scorers: 0, advanced: 0 };

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
    const mData = await apiGet(`/competitions/${COMP}/matches`);
    const matchUpserts: Record<string, unknown>[] = [];
    for (const m of (mData.matches ?? []) as Array<Record<string, unknown>>) {
      if (m.stage !== "GROUP_STAGE") continue;
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

    // SCORERS -> players.goals (cruce aproximado por equipo + apellido)
    try {
      const scData = await apiGet(`/competitions/${COMP}/scorers?limit=100`);
      const scorers = (scData.scorers ?? []) as Array<Record<string, unknown>>;

      // cargar todos los jugadores (en dos tandas por el límite de 1000)
      const [pp1, pp2] = await Promise.all([
        supabase.from("players").select("id,full_name,team_id").range(0, 999),
        supabase.from("players").select("id,full_name,team_id").range(1000, 1999),
      ]);
      const allPlayers = [...(pp1.data ?? []), ...(pp2.data ?? [])] as Array<{ id: string; full_name: string; team_id: string }>;
      const byTeam = new Map<string, Array<{ id: string; full_name: string }>>();
      for (const p of allPlayers) {
        const arr = byTeam.get(p.team_id) ?? [];
        arr.push({ id: p.id, full_name: p.full_name });
        byTeam.set(p.team_id, arr);
      }

      // reiniciar goles y aplicar los del ranking de goleadores
      await supabase.from("players").update({ goals: 0 }).gte("goals", 0);

      const updates: Array<{ id: string; goals: number }> = [];
      for (const s of scorers) {
        const team = s.team as { id: number } | undefined;
        const player = s.player as { name: string } | undefined;
        const goals = (s.goals as number) ?? (s.numberOfGoals as number) ?? 0;
        if (!team || !player || !goals) continue;
        const mapped = teamByApi.get(team.id);
        if (!mapped) continue;
        const cand = byTeam.get(mapped.id) ?? [];
        const hit = matchScorer(player.name, cand);
        if (hit) updates.push({ id: hit.id, goals });
      }
      await Promise.all(updates.map((u) => supabase.from("players").update({ goals: u.goals }).eq("id", u.id)));
      summary.scorers = updates.length;
    } catch (scErr) {
      // si /scorers falla (p.ej. aún sin datos), no rompemos el resto del sync
      summary.scorers = -1;
    }

    // Foto del ranking (para flechas ↑↓ y MVP/Paquete del día)
    try { await supabase.rpc("save_ranking_snapshot"); } catch { /* no rompe el sync */ }

    await supabase.from("api_sync_logs").insert({
      source: "football-data", endpoint: "/standings + /matches + /scorers", status: "ok",
      rows_upserted: summary.teams + summary.matches + summary.scorers, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("api_sync_logs").insert({
      source: "football-data", endpoint: "/standings + /matches + /scorers", status: "error",
      error: message, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
