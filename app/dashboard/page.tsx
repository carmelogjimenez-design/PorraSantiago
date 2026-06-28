import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Avatar from "../components/avatar";
import Countdown from "./countdown";
import Bracket, { type KoMatchVM } from "./bracket";
export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = { id: string; home_team_id: string; away_team_id: string; kickoff_at: string; status: string };
type KoLbRow = { user_id: string; display_name: string; avatar_url: string | null; total_points: number | string };

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
.dfx-hero{position:relative;overflow:hidden;border-radius:30px;padding:42px 40px;color:var(--text);isolation:isolate;background:linear-gradient(135deg,#FFFFFF 0%,#FFF4F7 52%,#FFE7EE 100%);border:1px solid var(--border);box-shadow:0 1px 2px rgba(20,15,20,.04),0 30px 60px -28px rgba(255,45,85,.28)}
.dfx-hero-in{position:relative;z-index:1;display:flex;align-items:center;gap:30px}
.dfx-hero-main{flex:1;min-width:0}
.dfx-hero-art{flex:none;width:300px;display:grid;place-items:center;position:relative}
.dfx-art-glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,45,85,.20),rgba(255,45,85,0));filter:blur(6px);z-index:0}
.dfx-appicon{position:relative;z-index:1;width:200px;height:200px;object-fit:contain;filter:drop-shadow(0 22px 32px rgba(255,45,85,.32));transform:rotate(-4deg);animation:dfxfloat 6s ease-in-out infinite}
.dfx-badge{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;background:rgba(255,255,255,.16);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.28);padding:6px 13px;border-radius:999px}
.dfx-h1{font-family:var(--font-display),sans-serif;font-weight:800;letter-spacing:-.03em;font-size:clamp(40px,6.6vw,72px);line-height:.9;margin-top:14px;color:var(--text)}
.dfx-gw{background:linear-gradient(120deg,#FF2D55,#FF5C7A);-webkit-background-clip:text;background-clip:text;color:transparent}
.dfx-lead{margin-top:15px;max-width:34ch;font-weight:500;font-size:15px;color:var(--text-dim)}
.dfx-grid{display:grid;grid-template-columns:1fr 332px;gap:22px;margin-top:22px}
.dfx-col{min-width:0;display:flex;flex-direction:column;gap:22px}
.dfx-shead{display:flex;align-items:center;gap:10px;margin-bottom:13px}
.dfx-shead h2{font-family:var(--font-display),sans-serif;font-weight:800;font-size:19px;letter-spacing:-.02em}
.dfx-pip{width:18px;height:3px;border-radius:9px;background:linear-gradient(135deg,#FF2D55,#FF5C7A)}
.dfx-more{margin-left:auto;font-size:12px;font-weight:700;color:var(--accent)}
.dfx-card{background:var(--card);border:1px solid var(--border);border-radius:20px;box-shadow:0 1px 2px rgba(20,15,20,.04),0 18px 40px -22px rgba(20,15,20,.20)}
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
.dfx-side{display:flex;flex-direction:column;gap:16px}
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
.dfx-brand{margin-bottom:20px}
.dfx-brand-name{font-family:var(--font-display),sans-serif;font-weight:800;font-size:15px;letter-spacing:.06em;line-height:1;text-transform:uppercase}
.dfx-brand-sub{font-size:12px;font-weight:600;color:var(--text-dim);margin-top:5px}
@media(max-width:900px){.dfx-grid{grid-template-columns:1fr}}
@media(max-width:520px){.dfx-games{grid-template-columns:1fr}}
@keyframes dfxpulse{0%{box-shadow:0 0 0 0 rgba(255,45,85,.55)}70%{box-shadow:0 0 0 8px rgba(255,45,85,0)}100%{box-shadow:0 0 0 0 rgba(255,45,85,0)}}
@keyframes dfxfloat{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(-4deg) translateY(-9px)}}
@media(max-width:820px){.dfx-hero-art{display:none}}
@media(prefers-reduced-motion:reduce){.dfx-appicon{animation:none}}
`;

const I_EYE = (<svg className="dfx-ic" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>);
const I_TARGET = (<svg className="dfx-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>);
const I_TROPHY = (<svg className="dfx-ic" viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0zM5 5h2v2a2 2 0 0 1-2-2zM19 5h-2v2a2 2 0 0 0 2-2zM9 14h6l-1 4h-4z" /></svg>);
const I_BRACKET = (<svg className="dfx-ic" viewBox="0 0 24 24"><path d="M4 5h5v6h6M4 19h5v-6" /><circle cx="18" cy="11" r="2" /></svg>);

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const nowIso = new Date().toISOString();
  const [profileRes, teamsRes, nextRes, koLbRes, koAllRes] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      supabase.from("teams").select("id,name,flag_url,group_id"),
      // Próximos partidos: SOLO fase final (round no nulo)
      supabase.from("matches").select("id,home_team_id,away_team_id,kickoff_at,status").not("round", "is", null).gt("kickoff_at", nowIso).order("kickoff_at").limit(5),
      supabase.rpc("get_knockout_leaderboard"),
      // Todos los partidos KO para el cuadro (bracket)
      supabase.from("matches").select("home_team_id,away_team_id,kickoff_at,status,home_score,away_score,round,api_fixture_id").not("round", "is", null).order("api_fixture_id"),
    ]);
  const name = profileRes.data?.display_name ?? "Jugador";

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const next = (nextRes.data ?? []) as MatchRow[];
  const upcoming = next.map((m) => {
    const h = teamById.get(m.home_team_id);
    const a = teamById.get(m.away_team_id);
    return {
      home: { name: h?.name ?? "?", flag: h?.flag_url ?? null },
      away: { name: a?.name ?? "?", flag: a?.flag_url ?? null },
      kickoff: m.kickoff_at,
    };
  });

  // Clasificación FASE FINAL (desde 0)
  const lb = ((koLbRes.data ?? []) as KoLbRow[]).map((r) => ({ ...r, total_points: Number(r.total_points) }));
  const meIdx = lb.findIndex((r) => r.user_id === user.id);
  const points = meIdx >= 0 ? lb[meIdx].total_points : 0;
  const posRank = meIdx >= 0 ? meIdx + 1 : lb.length;
  const topHasPoints = (lb[0]?.total_points ?? 0) > 0;
  const top3 = lb.slice(0, 3);

  // Partidos KO -> modelo para el cuadro (bracket)
  type KoRow = { home_team_id: string | null; away_team_id: string | null; kickoff_at: string | null; status: string; home_score: number | null; away_score: number | null; round: string; api_fixture_id: number | null };
  const koMatches: KoMatchVM[] = ((koAllRes.data ?? []) as KoRow[]).map((m, idx) => {
    const h = m.home_team_id ? teamById.get(m.home_team_id) : undefined;
    const a = m.away_team_id ? teamById.get(m.away_team_id) : undefined;
    return {
      round: m.round,
      order: m.api_fixture_id ?? idx,
      homeName: h?.name ?? null, homeFlag: h?.flag_url ?? null,
      awayName: a?.name ?? null, awayFlag: a?.flag_url ?? null,
      homeScore: m.home_score, awayScore: m.away_score,
      status: m.status, kickoff: m.kickoff_at,
    };
  });

  return (
    <AppShell userName={name} points={points}>
      <style dangerouslySetInnerHTML={{ __html: DFX_CSS }} />
      <div className="dfx">
        {/* HERO */}
        <section className="dfx-hero">
          <div className="dfx-hero-in">
            <div className="dfx-hero-main">
              <div className="dfx-brand">
                <div className="dfx-brand-name">La Porra de Santiago</div>
                <div className="dfx-brand-sub">Mundial 2026 · Fase final</div>
              </div>
              <h1 className="dfx-h1">Predice.<br />Compite.<br /><span className="dfx-gw">Gana.</span></h1>
              <p className="dfx-lead">Empieza la eliminatoria. Ronda a ronda, a por el título. La porra dirá quién es el crack… y quién el cuñao.</p>
              <Countdown matches={upcoming} />
            </div>
            <div className="dfx-hero-art">
              <div className="dfx-art-glow" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="dfx-appicon" src="/logo-sinfondo.png" alt="La Porra de Santiago" />
            </div>
          </div>
        </section>

        <div className="dfx-grid">
          <div className="dfx-col">
            {/* tu juego */}
            <div>
              <div className="dfx-shead"><span className="dfx-pip" /><h2>Tu juego</h2></div>
              <div className="dfx-games">
                <GameCard href="/fase-final" icon={I_BRACKET} title="Fase final" sub="Pronostica los cruces de la eliminatoria" />
                <GameCard href="/pronosticos" icon={I_EYE} title="Pronósticos" sub="Lo que ha puesto la peña, partido a partido" />
                <GameCard href="/goleadores" icon={I_TARGET} title="Goleadores" sub="Tus 3 goleadores para la fase final" />
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
          </div>

          {/* SIDEBAR */}
          <div className="dfx-side">
            <Link href="/ranking" className="dfx-points">
              <div className="dfx-points-row">
                <span className="dfx-gico">{I_TROPHY}</span>
                <div style={{ flex: 1 }}>
                  <div className="dfx-big2">{points} <small>pts</small></div>
                  <div className="dfx-cap2">{topHasPoints ? `Puesto #${posRank} de ${lb.length} · Fase final` : "La fase final arranca con el 1er dieciseisavos"}</div>
                </div>
                <span style={{ opacity: .8 }}>→</span>
              </div>
            </Link>

            <div className="dfx-card dfx-panel">
              <div className="dfx-ph">Top 3 · Fase final {topHasPoints && <Link href="/ranking" className="dfx-more">Ver todo</Link>}</div>
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
                <div className="dfx-empty"><div className="e">{I_TROPHY}</div>Todos a 0.<br />La fase final arranca con el 1er dieciseisavos.</div>
              )}
            </div>

            <div className="dfx-card dfx-panel">
              <div className="dfx-ph">Próximos partidos <Link href="/fase-final" className="dfx-more">Ver todos</Link></div>
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

        {/* CUADRO / BRACKET */}
        <section style={{ marginTop: 26 }}>
          <div className="dfx-shead"><span className="dfx-pip" /><h2>El cuadro · camino a la final</h2></div>
          <div className="dfx-card" style={{ padding: 14 }}>
            <Bracket matches={koMatches} />
          </div>
        </section>

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
