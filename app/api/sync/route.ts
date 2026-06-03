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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const manualOk = searchParams.get("secret") === process.env.SYNC_SECRET;
  const cronOk = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!manualOk && !cronOk) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const summary: Record<string, number> = { teams: 0, standings: 0, matches: 0 };

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

    await supabase.from("api_sync_logs").insert({
      source: "football-data", endpoint: "/standings + /matches", status: "ok",
      rows_upserted: summary.teams + summary.matches, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("api_sync_logs").insert({
      source: "football-data", endpoint: "/standings + /matches", status: "error",
      error: message, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
