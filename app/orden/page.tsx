import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";

export const dynamic = "force-dynamic";

type GroupRow = { id: number; label: string };
type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = { id: string; group_id: number | null; home_team_id: string; away_team_id: string };
type PredRow = { match_id: string; pred_home: number; pred_away: number };

const POS = ["#f5b301", "#9aa3af", "#cd7f32"]; // oro, plata, bronce

export default async function OrdenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, myPtsRes, groupsRes, teamsRes, matchesRes, predsRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.rpc("get_my_points"),
    supabase.from("groups").select("id,label").order("id"),
    supabase.from("teams").select("id,name,flag_url,group_id"),
    supabase.from("matches").select("id,group_id,home_team_id,away_team_id"),
    supabase.from("predictions").select("match_id,pred_home,pred_away").eq("user_id", user.id),
  ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const points = Number(myPtsRes.data ?? 0);
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const preds = (predsRes.data ?? []) as PredRow[];
  const predByMatch = new Map(preds.map((p) => [p.match_id, p]));

  type Row = { name: string; flag: string | null; pts: number; dg: number; gf: number };
  const standings = new Map<number, { rows: Row[]; predicted: number; total: number }>();
  for (const g of groups) {
    const acc = new Map<string, Row>();
    for (const t of teams.filter((t) => t.group_id === g.id)) {
      acc.set(t.id, { name: t.name, flag: t.flag_url, pts: 0, dg: 0, gf: 0 });
    }
    const gmatches = matches.filter((m) => m.group_id === g.id);
    let predicted = 0;
    for (const m of gmatches) {
      const p = predByMatch.get(m.id);
      if (!p || p.pred_home == null || p.pred_away == null) continue;
      predicted++;
      const rh = acc.get(m.home_team_id);
      const ra = acc.get(m.away_team_id);
      if (!rh || !ra) continue;
      rh.gf += p.pred_home; ra.gf += p.pred_away;
      rh.dg += p.pred_home - p.pred_away; ra.dg += p.pred_away - p.pred_home;
      if (p.pred_home > p.pred_away) rh.pts += 3;
      else if (p.pred_home < p.pred_away) ra.pts += 3;
      else { rh.pts += 1; ra.pts += 1; }
    }
    const rows = [...acc.values()].sort((x, y) =>
      y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.name.localeCompare(y.name)
    );
    standings.set(g.id, { rows, predicted, total: gmatches.length });
  }

  // Los 8 mejores terceros (entre los 12 grupos) según tus pronósticos
  const thirds: { groupId: number; r: Row }[] = [];
  for (const g of groups) {
    const s = standings.get(g.id);
    if (s && s.rows[2]) thirds.push({ groupId: g.id, r: s.rows[2] });
  }
  thirds.sort((a, b) => b.r.pts - a.r.pts || b.r.dg - a.r.dg || b.r.gf - a.r.gf || a.r.name.localeCompare(b.r.name));
  const bestThirdGroups = new Set(thirds.slice(0, 8).map((t) => t.groupId));

  return (
    <AppShell userName={name} points={points}>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Orden de grupos</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Tu orden se calcula solo a partir de tus resultados. Para cambiarlo, ajusta tus marcadores.
      </p>
      <Link href="/grupos" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-extrabold text-white transition active:scale-95">
        Editar mis resultados →
      </Link>

      {groups.map((g) => {
        const s = standings.get(g.id);
        if (!s) return null;
        const incomplete = s.predicted < s.total;
        return (
          <section key={g.id} className="mt-5">
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] font-[family-name:var(--font-display)] text-base font-extrabold text-white">
                {g.label}
              </span>
              <span className="font-extrabold">Grupo {g.label}</span>
              {incomplete && (
                <span className="ml-auto rounded-full bg-[var(--amber-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--amber)]">
                  faltan {s.total - s.predicted} resultados
                </span>
              )}
            </div>

            <div className="card overflow-hidden p-0">
              {s.rows.map((r, idx) => {
                const zone = idx < 2 ? "bg-[var(--green-soft)]" : idx === 2 && bestThirdGroups.has(g.id) ? "bg-[var(--amber-soft)]" : "";
                return (
                  <div key={r.name} className={`flex items-center gap-3 px-3 py-2.5 ${idx > 0 ? "border-t border-[var(--border)]" : ""} ${zone}`}>
                    <span
                      className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-extrabold ${idx < 3 ? "text-white" : "bg-[var(--soft)] text-[var(--text-dim)]"}`}
                      style={idx < 3 ? { background: POS[idx] } : undefined}>
                      {idx + 1}
                    </span>
                    {r.flag && <img src={r.flag} alt="" className="h-4 w-6 flex-none rounded-sm object-cover" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.name}</span>
                    <span className="flex-none text-[11px] text-[var(--text-dim)]">{r.dg > 0 ? `+${r.dg}` : r.dg} DG</span>
                    <span className="flex-none font-[family-name:var(--font-display)] text-sm font-extrabold">
                      {r.pts}<span className="ml-0.5 text-[10px] font-bold text-[var(--text-dim)]">pts</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[10px] text-[var(--text-dim)]">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[var(--green-soft)] align-middle" />1º y 2º: pasan</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[var(--amber-soft)] align-middle" />3º entre tus 8 mejores: pasa</span>
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
