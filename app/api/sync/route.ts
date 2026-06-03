import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY ?? "" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football ${path} -> HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error("API-Football error: " + JSON.stringify(json.errors));
  }
  return json.response ?? [];
}

function statusMap(short: string): "scheduled" | "live" | "finished" | "postponed" {
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST", "CANC", "ABD", "SUSP", "AWD", "WO"].includes(short)) return "postponed";
  return "scheduled";
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

    const standings = await apiGet(`/standings?league=${LEAGUE}&season=${SEASON}`);
    const groupsData: Array<Array<Record<string, unknown>>> = standings[0]?.league?.standings ?? [];

    const teamUpserts: Record<string, unknown>[] = [];
    for (const groupArr of groupsData) {
      for (const row of groupArr as Array<Record<string, unknown>>) {
        const label = String((row.group as string) || "").trim().slice(-1).toUpperCase();
        const team = row.team as { id: number; name: string; logo: string };
        teamUpserts.push({
          api_team_id: team.id,
          name: team.name,
          flag_url: team.logo,
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

    const standingUpserts: Record<string, unknown>[] = [];
    for (const groupArr of groupsData) {
      for (const row of groupArr as Array<Record<string, unknown>>) {
        const label = String((row.group as string) || "").trim().slice(-1).toUpperCase();
        const team = row.team as { id: number };
        const group_id = groupIdByLabel.get(label);
        const mapped = teamByApi.get(team.id);
        if (!group_id || !mapped) continue;
        const all = row.all as { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
        standingUpserts.push({
          group_id, team_id: mapped.id,
          played: all?.played ?? 0, won: all?.win ?? 0, drawn: all?.draw ?? 0, lost: all?.lose ?? 0,
          gf: all?.goals?.for ?? 0, ga: all?.goals?.against ?? 0,
          points: (row.points as number) ?? 0, rank: (row.rank as number) ?? null,
        });
      }
    }
    if (standingUpserts.length) {
      await supabase.from("standings").upsert(standingUpserts, { onConflict: "group_id,team_id" });
    }
    summary.standings = standingUpserts.length;

    const fixtures = await apiGet(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
    const matchUpserts: Record<string, unknown>[] = [];
    for (const fx of fixtures as Array<Record<string, unknown>>) {
      const league = fx.league as { round?: string };
      const round = league?.round ?? "";
      if (!round.toLowerCase().includes("group")) continue;
      const teams = fx.teams as { home: { id: number }; away: { id: number } };
      const home = teamByApi.get(teams.home?.id);
      const away = teamByApi.get(teams.away?.id);
      if (!home || !away) continue;
      const fixture = fx.fixture as { id: number; date: string; venue?: { name?: string }; status?: { short?: string } };
      const goals = fx.goals as { home: number | null; away: number | null };
      matchUpserts.push({
        api_fixture_id: fixture.id,
        group_id: home.group_id,
        home_team_id: home.id,
        away_team_id: away.id,
        kickoff_at: fixture.date,
        stadium: fixture.venue?.name ?? null,
        status: statusMap(fixture.status?.short ?? "NS"),
        home_score: goals?.home ?? null,
        away_score: goals?.away ?? null,
        updated_at: new Date().toISOString(),
      });
    }
    if (matchUpserts.length) {
      const { error } = await supabase.from("matches").upsert(matchUpserts, { onConflict: "api_fixture_id" });
      if (error) throw new Error("matches upsert: " + error.message);
    }
    summary.matches = matchUpserts.length;

    await supabase.from("api_sync_logs").insert({
      source: "api-football", endpoint: "/standings + /fixtures", status: "ok",
      rows_upserted: summary.teams + summary.matches, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("api_sync_logs").insert({
      source: "api-football", endpoint: "/standings + /fixtures", status: "error",
      error: message, finished_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
