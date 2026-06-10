import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Avatar from "../components/avatar";
import Countdown from "./countdown";
export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = { id: string; home_team_id: string; away_team_id: string; kickoff_at: string; status: string };
type GroupRow = { id: number; label: string };
type LbRow = { user_id: string; display_name: string; avatar_url: string | null; total_points: number | string };

const POS = ["#f5b301", "#c0c5cd", "#d59a5f"];

// Códigos de selección (arregla colisiones como South Africa / South Korea -> "SOU")
const CODE: Record<string, string> = {
  Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL", "Bosnia-Herzegovina": "BIH",
  "Bosnia and Herzegovina": "BIH", Brazil: "BRA", Canada: "CAN", Colombia: "COL", "Costa Rica": "CRC",
  Croatia: "CRO", Czechia: "CZE", "Czech Republic": "CZE", Denmark: "DEN", Ecuador: "ECU", Egypt: "EGY",
  England: "ENG", France: "FRA", Germany: "GER", Ghana: "GHA", Haiti: "HAI", Iran: "IRN", Italy: "ITA",
  "Ivory Coast": "CIV", Japan: "JPN", Mexico: "MEX", Morocco: "MAR", Netherlands: "NED", Nigeria: "NGA",
  Norway: "NOR", Panama: "PAN", Paraguay: "PAR", Peru: "PER", Poland: "POL", Portugal: "POR", Qatar: "QAT",
  "Saudi Arabia": "KSA", Scotland: "SCO", Senegal: "SEN", Serbia: "SRB", "South Africa": "RSA",
  "South Korea": "KOR", Spain: "ESP", Sweden: "SWE", Switzerland: "SUI", Tunisia: "TUN", Turkey: "TUR",
  Ukraine: "UKR", "United States": "USA", Uruguay: "URU", Uzbekistan: "UZB", Wales: "WAL",
};
const abbr = (n: string) => CODE[n] ?? n.slice(0, 3).toUpperCase();

const DFX_CSS = `
.dfx{color:var(--text)}
.dfx-hero{position:relative;overflow:hidden;border-radius:30px;padding:42px 34px 32px;color:#fff;isolation:isolate}
.dfx-mesh{position:absolute;inset:0;z-index:-2;background:radial-gradient(55% 75% at 12% 18%,#FF6E8A 0%,rgba(255,110,138,0) 60%),radial-gradient(48% 65% at 88% 8%,#FF2D55 0%,rgba(255,45,85,0) 55%),radial-gradient(75% 95% at 72% 100%,#D81C57 0%,rgba(216,28,87,0) 60%),linear-gradient(125deg,#FF3A60 0%,#C61F41 100%);background-size:180% 180%;animation:dfxmesh 16s ease-in-out infinite}
.dfx-grain{position:absolute;inset:0;z-index:-1;opacity:.10;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.dfx-orb{position:absolute;width:120px;height:120px;border-radius:50%;filter:blur(8px);z-index:-1;background:#fff;opacity:.12;right:18%;top:14%}
.dfx-emblem{position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:330px;height:330px;opacity:.16;z-index:-1}
.dfx-badge{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;background:rgba(255,255,255,.16);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.28);padding:6px 13px;border-radius:999px}
.dfx-pulse{width:7px;height:7px;border-radius:50%;background:#fff;animation:dfxpulse 2s infinite}
.dfx-h1{font-family:var(--font-display),sans-serif;font-weight:800;letter-spacing:-.025em;font-size:clamp(40px,7vw,72px);line-height:.92;margin-top:16px;text-shadow:0 2px 30px rgba(0,0,0,.18)}
.dfx-gw{background:linear-gradient(90deg,#FFE3E9,#fff);-webkit-background-clip:text;background-clip:text;color:transparent}
.dfx-lead{margin-top:15px;max-width:34ch;font-weight:500;font-size:15px;color:rgba(255,255,255,.92)}
.dfx-clock{margin-top:26px;display:inline-flex;align-items:stretch;gap:8px;flex-wrap:wrap}
.dfx-cl{min-width:72px;text-align:center;padding:13px 8px;border-radius:16px;background:rgba(255,255,255,.14);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.26);box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.dfx-n{font-family:var(--font-display),sans-serif;font-weight:800;font-size:38px;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 0 24px rgba(255,255,255,.45)}
.dfx-l{margin-top:7px;font-size:10px;font-weight:800;letter-spacing:.16em;color:rgba(255,255,255,.8)}
.dfx-kick{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;background:rgba(255,255,255,.95);min-width:auto;padding:13px 18px;text-align:left}
.dfx-kick small{font-size:11px;font-weight:700;color:var(--text-dim)}
.dfx-kick b{font-family:var(--font-display),sans-serif;font-weight:800;font-size:14px;margin-top:2px;color:var(--text)}
.dfx-grid{display:grid;grid-template-columns:1fr 332px;gap:22px;margin-top:22px}
.dfx-col{min-width:0;display:flex;flex-direction:column;gap:22px}
.dfx-shead{display:flex;align-items:center;gap:10px;margin-bottom:13px}
.dfx-shead h2{font-family:var(--font-display),sans-serif;font-weight:800;font-size:19px;letter-spacing:-.02em}
.dfx-pip{width:18px;height:3px;border-radius:9px;background:linear-gradient(135deg,#FF2D55,#FF5C7A)}
.dfx-more{margin-left:auto;font-size:12px;font-weight:700;color:var(--accent)}
.dfx-card{background:var(--card);border:1px solid var(--border);border-radius:20px;box-shadow:0 1px 2px rgba(20,15,20,.04),0 18px 40px -22px rgba(20,15,20,.20)}
.dfx-ready{padding:22px 24px;position:relative;overflow:hidden}
.dfx-ready-h{display:flex;align-items:center;gap:10px}
.dfx-ready-h h2{font-family:var(--font-display),sans-serif;font-weight:800;font-size:20px}
.dfx-tag{font-size:11px;font-weight:800;color:#fff;background:var(--green);padding:4px 11px;border-radius:999px}
.dfx-checks{margin-top:18px;display:flex;flex-direction:column;gap:15px}
.dfx-ck{display:flex;align-items:center;gap:13px}
.dfx-ck-ico{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;flex:none}
.dfx-ck-t{font-weight:700;font-size:14px}
.dfx-ck-bar{margin-top:7px;height:6px;border-radius:99px;background:var(--soft);overflow:hidden}
.dfx-ck-bar i{display:block;height:100%;border-radius:99px}
.dfx-ck-v{font-family:var(--font-display),sans-serif;font-weight:800;font-size:14px;flex:none}
.dfx-ck-txt{flex:1;min-width:0}
.dfx-note{margin-top:14px;font-size:12px;font-weight:600;color:var(--text-dim)}
.dfx-games{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.dfx-game{position:relative;padding:22px;overflow:hidden;display:block;transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s}
.dfx-game:hover{transform:translateY(-5px);box-shadow:0 1px 2px rgba(20,15,20,.05),0 10px 30px -10px rgba(255,45,85,.45)}
.dfx-game-chip{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#FF2D55,#FF5C7A);box-shadow:0 8px 18px -8px rgba(255,45,85,.6);transition:.25s}
.dfx-game:hover .dfx-game-chip{transform:scale(1.06) rotate(-3deg)}
.dfx-game h3{font-family:var(--font-display),sans-serif;font-weight:800;font-size:17px;margin-top:18px;letter-spacing:-.015em}
.dfx-game-sub{margin-top:5px;font-size:13px;color:var(--text-dim);font-weight:500}
.dfx-arr{position:absolute;right:20px;top:22px;color:var(--text-dim);font-size:18px;transition:.25s;opacity:.55}
.dfx-game:hover .dfx-arr{color:var(--accent);transform:translateX(3px);opacity:1}
.dfx-trivia{display:flex;align-items:center;gap:15px;padding:18px 20px;overflow:hidden;background:linear-gradient(135deg,var(--card) 0%,#FBF1F8 100%);transition:.25s}
.dfx-trivia:hover{transform:translateY(-3px);box-shadow:0 1px 2px rgba(20,15,20,.05),0 16px 36px -16px rgba(160,40,120,.4)}
.dfx-trivia-chip{width:52px;height:52px;border-radius:16px;flex:none;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,#A24BFF,#FF2D55);box-shadow:0 8px 20px -8px rgba(140,50,200,.6)}
.dfx-trivia h3{font-family:var(--font-display),sans-serif;font-weight:800;font-size:16px}
.dfx-trivia-sub{font-size:13px;color:var(--text-dim);font-weight:500;margin-top:2px}
.dfx-groups{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
.dfx-grp{padding:15px 15px 11px}
.dfx-grp-l{display:flex;align-items:center;gap:8px;margin-bottom:11px}
.dfx-grp-b{width:24px;height:24px;border-radius:8px;background:var(--accent-soft);color:var(--accent-deep);display:grid;place-items:center;font-family:var(--font-display),sans-serif;font-weight:800;font-size:12px}
.dfx-grp-l span{font-family:var(--font-display),sans-serif;font-weight:700;font-size:13px}
.dfx-team{display:flex;align-items:center;gap:9px;padding:5px 0;font-size:13px;font-weight:600}
.dfx-team b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.dfx-side{display:flex;flex-direction:column;gap:16px}
.dfx-stat{display:flex;align-items:center;gap:15px;padding:18px}
.dfx-ring{width:58px;height:58px;flex:none;position:relative}
.dfx-ring .pct{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:12px}
.dfx-big{font-family:var(--font-display),sans-serif;font-weight:800;font-size:25px;line-height:1}
.dfx-big small{font-size:13px;color:var(--text-dim);font-weight:700}
.dfx-cap{margin-top:5px;font-size:11px;font-weight:700;color:var(--text-dim)}
.dfx-points{position:relative;overflow:hidden;color:#fff;padding:20px;border-radius:20px;background:linear-gradient(135deg,#FF2D55,#C61F41);box-shadow:0 10px 30px -10px rgba(255,45,85,.45);display:block;transition:.25s}
.dfx-points:hover{transform:translateY(-3px)}
.dfx-points-row{display:flex;align-items:center;gap:13px;position:relative}
.dfx-gico{width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);display:grid;place-items:center;flex:none}
.dfx-big2{font-family:var(--font-display),sans-serif;font-weight:800;font-size:28px;line-height:1}
.dfx-big2 small{font-size:14px;opacity:.85;font-weight:700}
.dfx-cap2{margin-top:5px;font-size:11px;font-weight:600;opacity:.88}
.dfx-panel{padding:17px 18px}
.dfx-ph{font-family:var(--font-display),sans-serif;font-weight:800;font-size:14px;margin-bottom:13px;display:flex;justify-content:space-between;align-items:center}
.dfx-empty{text-align:center;color:var(--text-dim);font-size:13px;font-weight:500;padding:12px 0}
.dfx-empty .e{width:44px;height:44px;border-radius:50%;background:var(--soft);display:grid;place-items:center;margin:0 auto 9px}
.dfx-match{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--border)}
.dfx-match:first-of-type{border-top:0}
.dfx-ab{font-family:var(--font-display),sans-serif;font-weight:800;font-size:13px;width:38px}
.dfx-when{margin:0 auto;text-align:center;font-size:10px;font-weight:700;color:var(--text-dim);line-height:1.25}
.dfx-ab.r{text-align:right}
.dfx-rank3{display:flex;align-items:center;gap:10px;padding:7px 0}
.dfx-rank3+.dfx-rank3{border-top:1px solid var(--border)}
.dfx-foot{margin-top:24px;border-top:1px solid var(--border);padding-top:16px;font-size:12px;color:var(--text-dim);font-weight:600;opacity:.8}
.dfx-ic{width:22px;height:22px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:900px){.dfx-grid{grid-template-columns:1fr}.dfx-emblem{display:none}.dfx-groups{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.dfx-games{grid-template-columns:1fr}}
@keyframes dfxmesh{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes dfxpulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
@media(prefers-reduced-motion:reduce){.dfx-mesh{animation:none}.dfx-pulse{animation:none}}
`;

const I_BALL = (<svg className="dfx-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7l3 2-1 3.5h-4L9 9z" /></svg>);
const I_GRID = (<svg className="dfx-ic" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
const I_TARGET = (<svg className="dfx-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>);
const I_TROPHY = (<svg className="dfx-ic" viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0zM5 5h2v2a2 2 0 0 1-2-2zM19 5h-2v2a2 2 0 0 0 2-2zM9 14h6l-1 4h-4z" /></svg>);

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const nowIso = new Date().toISOString();
  const [profileRes, totalRes, doneRes, firstRes, teamsRes, nextRes, groupsRes, lbRes, matchesGRes, scorersDoneRes] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("predictions").select("match_id").eq("user_id", user.id),
      supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
      supabase.from("teams").select("id,name,flag_url,group_id"),
      supabase.from("matches").select("id,home_team_id,away_team_id,kickoff_at,status").gt("kickoff_at", nowIso).order("kickoff_at").limit(5),
      supabase.from("groups").select("id,label").order("id").limit(4),
      supabase.rpc("get_leaderboard"),
      supabase.from("matches").select("id,group_id"),
      supabase.from("selected_scorers").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
  const name = profileRes.data?.display_name ?? "Jugador";
  const total = totalRes.count ?? 72;
  const predRows = (doneRes.data ?? []) as { match_id: string }[];
  const done = predRows.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const kickoff = firstRes.data?.kickoff_at ?? "2026-06-11T16:00:00Z";

  // Orden de grupos: nº de grupos (de 12) con TODOS sus partidos pronosticados
  const matchesG = (matchesGRes.data ?? []) as { id: string; group_id: number | null }[];
  const totalByGroup = new Map<number, number>();
  const mGroup = new Map<string, number | null>();
  for (const m of matchesG) {
    mGroup.set(m.id, m.group_id);
    if (m.group_id != null) totalByGroup.set(m.group_id, (totalByGroup.get(m.group_id) ?? 0) + 1);
  }
  const predByGroup = new Map<number, number>();
  for (const pr of predRows) {
    const g = mGroup.get(pr.match_id);
    if (g != null) predByGroup.set(g, (predByGroup.get(g) ?? 0) + 1);
  }
  let groupsDone = 0;
  for (const [g, tot] of totalByGroup) if (tot > 0 && (predByGroup.get(g) ?? 0) >= tot) groupsDone++;
  const groupsTotal = 12;

  const scorersDone = scorersDoneRes.count ?? 0;
  const scorersTotal = 12;
  const allDone = total > 0 && done >= total && groupsDone >= groupsTotal && scorersDone >= scorersTotal;

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const next = (nextRes.data ?? []) as MatchRow[];
  const groups = (groupsRes.data ?? []) as GroupRow[];
  const lb = ((lbRes.data ?? []) as LbRow[]).map((r) => ({ ...r, total_points: Number(r.total_points) }));
  const meIdx = lb.findIndex((r) => r.user_id === user.id);
  const points = meIdx >= 0 ? lb[meIdx].total_points : 0;
  const posRank = meIdx >= 0 ? meIdx + 1 : lb.length;
  const topHasPoints = (lb[0]?.total_points ?? 0) > 0;
  const top3 = lb.slice(0, 3);

  const R = 23, C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  return (
    <AppShell userName={name} points={points}>
      <style dangerouslySetInnerHTML={{ __html: DFX_CSS }} />
      <div className="dfx">
        {/* HERO */}
        <section className="dfx-hero">
          <div className="dfx-mesh" /><div className="dfx-grain" /><div className="dfx-orb" />
          <svg className="dfx-emblem" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="3" fill="#fff" stroke="none" />
            <path d="M100 46 L100 154 M70 70 L130 130 M130 70 L70 130" strokeWidth="1.2" opacity=".6" />
          </svg>
          <span className="dfx-badge"><span className="dfx-pulse" /> La Porra de Santiago · Mundial 2026</span>
          <h1 className="dfx-h1">Predice.<br />Compite.<br /><span className="dfx-gw">Gana.</span></h1>
          <p className="dfx-lead">En Santiago todos sabéis más que el seleccionador. La porra dirá quién es el crack… y quién el cuñao.</p>
          <Countdown target={kickoff} />
        </section>

        <div className="dfx-grid">
          <div className="dfx-col">
            {/* completion */}
            <div className="dfx-card dfx-ready">
              <div className="dfx-ready-h">
                <h2>{allDone ? "Todo listo" : "Antes del pitido"}</h2>
                {allDone
                  ? <span className="dfx-tag">LISTO PARA EL SAQUE</span>
                  : <span className="dfx-cap" style={{ marginLeft: "auto" }}>Te falta algo ⏰</span>}
              </div>
              <div className="dfx-checks">
                <CheckRow icon={I_BALL} href="/grupos" label="Partidos" done={done} total={total} />
                <CheckRow icon={I_GRID} href="/orden" label="Orden de grupos" done={groupsDone} total={groupsTotal} />
                <CheckRow icon={I_TARGET} href="/goleadores" label="Goleadores" done={scorersDone} total={scorersTotal} />
              </div>
              {!allDone && <p className="dfx-note">Lo que no rellenes antes de que empiece cada partido se queda sin puntos. ¡No te despistes! 😏</p>}
            </div>

            {/* tu juego */}
            <div>
              <div className="dfx-shead"><span className="dfx-pip" /><h2>Tu juego</h2></div>
              <div className="dfx-games">
                <GameCard href="/grupos" icon={I_BALL} title="Fase de grupos" sub={done >= total ? "¡Todo pronosticado!" : `${total - done} partidos sin pronosticar`} />
                <GameCard href="/orden" icon={I_GRID} title="Orden de grupos" sub="Predice 1º y 2º de cada grupo" />
                <GameCard href="/goleadores" icon={I_TARGET} title="Goleadores" sub="1 goleador por cada grupo" />
                <GameCard href="/ranking" icon={I_TROPHY} title="Ranking" sub="A por el oro · ¿quién manda aquí?" />
              </div>
              <Link href="/trivial" className="dfx-card dfx-trivia" style={{ marginTop: 15 }}>
                <span className="dfx-trivia-chip">🧠</span>
                <div style={{ flex: 1 }}>
                  <h3>Trivial del Mundial</h3>
                  <div className="dfx-trivia-sub">Preguntas frikis de Mundiales · ¿Rey del trivial?</div>
                </div>
                <span style={{ color: "var(--text-dim)" }}>→</span>
              </Link>
            </div>

            {/* grupos */}
            <div>
              <div className="dfx-shead"><span className="dfx-pip" /><h2>Grupos</h2><Link href="/grupos" className="dfx-more">Ver todos →</Link></div>
              <div className="dfx-groups">
                {groups.map((g) => {
                  const gt = teams.filter((t) => t.group_id === g.id).slice(0, 4);
                  return (
                    <div key={g.id} className="dfx-card dfx-grp">
                      <div className="dfx-grp-l"><span className="dfx-grp-b">{g.label}</span><span>Grupo {g.label}</span></div>
                      {gt.map((t) => (
                        <div key={t.id} className="dfx-team"><Flag src={t.flag_url} name={t.name} sm /><b>{t.name}</b></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="dfx-side">
            <div className="dfx-card dfx-stat">
              <div className="dfx-ring">
                <svg width="58" height="58" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="29" cy="29" r={R} fill="none" stroke="var(--soft)" strokeWidth="6.5" />
                  <circle cx="29" cy="29" r={R} fill="none" stroke="url(#dfxring)" strokeWidth="6.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
                  <defs><linearGradient id="dfxring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF2D55" /><stop offset="1" stopColor="#FF5C7A" /></linearGradient></defs>
                </svg>
                <div className="pct">{pct}%</div>
              </div>
              <div><div className="dfx-big">{done}<small>/{total}</small></div><div className="dfx-cap">Pronosticados</div></div>
            </div>

            <Link href="/ranking" className="dfx-points">
              <div className="dfx-points-row">
                <span className="dfx-gico">{I_TROPHY}</span>
                <div style={{ flex: 1 }}>
                  <div className="dfx-big2">{points} <small>pts</small></div>
                  <div className="dfx-cap2">{topHasPoints ? `Puesto #${posRank} de ${lb.length}` : "El ranking abre con el primer gol"}</div>
                </div>
                <span style={{ opacity: .8 }}>→</span>
              </div>
            </Link>

            <div className="dfx-card dfx-panel">
              <div className="dfx-ph">Top 3 por ahora {topHasPoints && <Link href="/ranking" className="dfx-more">Ver todo</Link>}</div>
              {topHasPoints ? (
                top3.map((r, i) => (
                  <div key={r.user_id} className="dfx-rank3">
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-extrabold text-white" style={{ background: POS[i] }}>{i + 1}</span>
                    <Avatar src={r.avatar_url} name={r.display_name} className="h-7 w-7" textClass="text-[11px]" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{r.display_name}</span>
                    <span className="text-[13px] font-extrabold" style={{ color: "var(--accent)" }}>{r.total_points} pts</span>
                  </div>
                ))
              ) : (
                <div className="dfx-empty"><div className="e">{I_TROPHY}</div>Aún sin clasificación.<br />Empieza cuando ruede el balón.</div>
              )}
            </div>

            <div className="dfx-card dfx-panel">
              <div className="dfx-ph">Próximos partidos <Link href="/grupos" className="dfx-more">Ver todos</Link></div>
              {next.length === 0 ? (
                <p className="dfx-empty">Sin partidos próximos.</p>
              ) : (
                next.map((m) => {
                  const h = teamById.get(m.home_team_id);
                  const a = teamById.get(m.away_team_id);
                  const d = new Date(m.kickoff_at);
                  const day = d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase();
                  const time = d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={m.id} className="dfx-match">
                      <Flag src={h?.flag_url ?? null} name={h?.name ?? "?"} />
                      <span className="dfx-ab">{abbr(h?.name ?? "?")}</span>
                      <span className="dfx-when">{day}<br />{time}</span>
                      <span className="dfx-ab r">{abbr(a?.name ?? "?")}</span>
                      <Flag src={a?.flag_url ?? null} name={a?.name ?? "?"} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="dfx-foot">© 2026 La Porra de Santiago · Todos los derechos pertenecen al puto amo de Carmelo García 👑</div>
      </div>
    </AppShell>
  );
}

function Flag({ src, name, sm }: { src: string | null; name: string; sm?: boolean }) {
  const cls = sm ? "h-4 w-6" : "h-5 w-7";
  if (!src) return <span className={`${cls} flex-none rounded bg-[var(--soft)]`} aria-label={name} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className={`${cls} flex-none rounded object-cover ring-1 ring-[var(--border)]`} />;
}

function CheckRow({ icon, href, label, done, total }: { icon: ReactNode; href: string; label: string; done: number; total: number }) {
  const full = total > 0 && done >= total;
  const p = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <Link href={href} className="dfx-ck">
      <span className="dfx-ck-ico" style={{ background: full ? "var(--green-soft)" : "var(--accent-soft)", color: full ? "var(--green)" : "var(--accent)" }}>{icon}</span>
      <span className="dfx-ck-txt">
        <span className="dfx-ck-t" style={{ display: "block" }}>{label}</span>
        <span className="dfx-ck-bar" style={{ display: "block" }}><i style={{ width: `${p}%`, background: full ? "linear-gradient(90deg,#1FC472,#16A35C)" : "linear-gradient(90deg,#FF2D55,#FF5C7A)" }} /></span>
      </span>
      <span className="dfx-ck-v" style={{ color: full ? "var(--green)" : "var(--text-dim)" }}>{done}/{total}{full ? " ✓" : ""}</span>
    </Link>
  );
}

function GameCard({ href, icon, title, sub }: { href: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="dfx-card dfx-game">
      <span className="dfx-arr">→</span>
      <span className="dfx-game-chip">{icon}</span>
      <h3>{title}</h3>
      <div className="dfx-game-sub">{sub}</div>
    </Link>
  );
}
