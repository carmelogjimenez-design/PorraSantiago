import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "../components/app-shell";
import Avatar from "../components/avatar";
import Icon from "../components/icons";
import Countdown from "./countdown";

export const dynamic = "force-dynamic";

type TeamRow = { id: string; name: string; flag_url: string | null; group_id: number | null };
type MatchRow = { id: string; home_team_id: string; away_team_id: string; kickoff_at: string; status: string };
type GroupRow = { id: number; label: string };
type LbRow = { user_id: string; display_name: string; avatar_url: string | null; total_points: number | string };

const abbr = (n: string) => n.slice(0, 3).toUpperCase();
const POS = ["#f5b301", "#c0c5cd", "#d59a5f"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();
  const [profileRes, totalRes, doneRes, firstRes, teamsRes, nextRes, groupsRes, lbRes] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("predictions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("matches").select("kickoff_at").order("kickoff_at").limit(1).maybeSingle(),
      supabase.from("teams").select("id,name,flag_url,group_id"),
      supabase.from("matches").select("id,home_team_id,away_team_id,kickoff_at,status").gt("kickoff_at", nowIso).order("kickoff_at").limit(5),
      supabase.from("groups").select("id,label").order("id").limit(4),
      supabase.rpc("get_leaderboard"),
    ]);

  const name = profileRes.data?.display_name ?? "Jugador";
  const total = totalRes.count ?? 72;
  const done = doneRes.count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const kickoff = firstRes.data?.kickoff_at ?? "2026-06-11T16:00:00Z";

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const teamById = new Map<string, TeamRow>(teams.map((t) => [t.id, t]));
  const next = (nextRes.data ?? []) as MatchRow[];
  const groups = (groupsRes.data ?? []) as GroupRow[];

  const lb = ((lbRes.data ?? []) as LbRow[]).map((r) => ({ ...r, total_points: Number(r.total_points) }));
  const meIdx = lb.findIndex((r) => r.user_id === user.id);
  const points = meIdx >= 0 ? lb[meIdx].total_points : 0;
  const pos = meIdx >= 0 ? meIdx + 1 : lb.length;
  const topHasPoints = (lb[0]?.total_points ?? 0) > 0;
  const top3 = lb.slice(0, 3);

  const R = 19, C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  return (
    <AppShell userName={name} points={points}>
      <div className="mb-5 flex items-center justify-between">
        <div className="text-sm font-extrabold tracking-wide">
          <span className="text-[var(--accent)]">MUNDIAL 2026</span>
          <span className="text-[var(--text-dim)]"> · 48 SELECCIONES</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_326px]">
        <div className="min-w-0">
          <section className="rise relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--accent)] opacity-[0.06] blur-2xl" />
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[0.98] tracking-tight sm:text-5xl">
              Predice.<br />Compite.<br /><span className="text-[var(--accent)]">Gana.</span>
            </h1>
            <p className="mt-3.5 max-w-xs font-semibold text-[var(--text-dim)]">
              Demuestra que sabes más fútbol que tus amigos.
            </p>
            <div className="mt-6 text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-dim)]">
              FALTA PARA EL MUNDIAL 2026
            </div>
            <Countdown target={kickoff} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" className="pointer-events-none absolute right-5 top-1/2 hidden w-44 -translate-y-1/2 opacity-95 sm:block" />
          </section>

          <h2 className="mb-3 mt-6 text-[13px] font-extrabold tracking-[0.06em]">TU JUEGO</h2>
          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GameCard href="/grupos" color="accent" icon="ball" title="FASE DE GRUPOS" sub={`${total - done} partidos sin pronosticar`} />
            <GameCard href="/orden" color="amber" icon="grid" title="ORDEN DE GRUPOS" sub="Predice 1º y 2º de cada grupo" />
            <GameCard href="/goleadores" color="green" icon="target" title="GOLEADORES" sub="Elige tus 3 cracks" />
            <GameCard href="/ranking" color="purple" icon="trophy" title="RANKING" sub="A por el oro · ¿Quién manda aquí?" />
          </div>

          <div className="mt-7 flex items-center justify-between">
            <h2 className="text-[13px] font-extrabold tracking-[0.06em]">GRUPOS</h2>
            <Link href="/grupos" className="text-xs font-bold text-[var(--accent)]">Ver todos los grupos ›</Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {groups.map((g) => {
              const gt = teams.filter((t) => t.group_id === g.id).slice(0, 4);
              return (
                <div key={g.id} className="card p-4">
                  <div className="mb-2.5 text-[11px] font-extrabold tracking-[0.1em] text-[var(--text-dim)]">GRUPO {g.label}</div>
                  {gt.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1 text-[13px] font-semibold">
                      <Flag src={t.flag_url} name={t.name} sm />
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card flex items-center gap-3.5 p-4">
            <div className="relative h-[52px] w-[52px] flex-none">
              <svg width="52" height="52" className="-rotate-90">
                <circle cx="26" cy="26" r={R} fill="none" stroke="var(--soft)" strokeWidth="6" />
                <circle cx="26" cy="26" r={R} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-[11px] font-extrabold">{pct}%</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-extrabold leading-none">{done}<span className="text-sm font-bold text-[var(--text-dim)]">/{total}</span></div>
              <div className="mt-1 text-[10px] font-extrabold tracking-[0.08em] text-[var(--text-dim)]">PRONOSTICADOS</div>
            </div>
          </div>

          <Link href="/ranking" className="card flex items-center gap-3.5 p-4 transition hover:border-[var(--accent)]">
            <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name="trophy" className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <div className="text-2xl font-extrabold leading-none">{points} <span className="text-sm font-bold text-[var(--text-dim)]">pts</span></div>
              <div className="mt-1 text-[10px] font-extrabold tracking-[0.08em] text-[var(--text-dim)]">
                {topHasPoints ? `PUESTO #${pos} DE ${lb.length}` : "RANKING PRONTO"}
              </div>
            </div>
            <span className="text-[var(--text-dim)]">›</span>
          </Link>

          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[12px] font-extrabold tracking-[0.08em]">TOP 3 POR AHORA</div>
              {topHasPoints && <Link href="/ranking" className="text-[11px] font-bold text-[var(--accent)]">Ver todo</Link>}
            </div>
            {topHasPoints ? (
              top3.map((r, i) => (
                <div key={r.user_id} className={`flex items-center gap-2.5 py-1.5 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                  <span className="grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-extrabold text-white" style={{ background: POS[i] }}>{i + 1}</span>
                  <Avatar src={r.avatar_url} name={r.display_name} className="h-7 w-7" textClass="text-[11px]" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{r.display_name}</span>
                  <span className="text-[13px] font-extrabold text-[var(--accent)]">{r.total_points} pts</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <span className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-[var(--soft)] text-[var(--text-dim)]">
                  <Icon name="trophy" className="h-5 w-5" />
                </span>
                <p className="text-[13px] font-semibold text-[var(--text-dim)]">
                  Aún sin clasificación.<br />Empieza cuando ruede el balón.
                </p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[12px] font-extrabold tracking-[0.08em]">PRÓXIMOS PARTIDOS</div>
              <Link href="/grupos" className="text-[11px] font-bold text-[var(--accent)]">Ver todos</Link>
            </div>
            {next.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-[var(--text-dim)]">Sin partidos próximos.</p>
            ) : (
              next.map((m, i) => {
                const h = teamById.get(m.home_team_id);
                const a = teamById.get(m.away_team_id);
                const d = new Date(m.kickoff_at);
                const day = d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase();
                const time = d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={m.id} className={`flex items-center gap-2 py-2.5 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                    <Flag src={h?.flag_url ?? null} name={h?.name ?? "?"} />
                    <span className="w-9 text-[12px] font-extrabold">{abbr(h?.name ?? "?")}</span>
                    <span className="ml-auto text-center text-[10px] font-bold leading-tight text-[var(--text-dim)]">{day}<br />{time}</span>
                    <span className="ml-auto w-9 text-right text-[12px] font-extrabold">{abbr(a?.name ?? "?")}</span>
                    <Flag src={a?.flag_url ?? null} name={a?.name ?? "?"} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-[var(--border)] pt-5 text-xs font-semibold text-[var(--text-dim)]">
        © 2026 La Porra de Santiago · Todos los derechos reservados
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

function GameCard({ href, color, icon, title, sub }:
  { href: string; color: "accent" | "amber" | "green" | "purple"; icon: string; title: string; sub: string }) {
  const map = {
    accent: { b: "var(--accent)", bg: "var(--accent-soft)" },
    amber: { b: "var(--amber)", bg: "var(--amber-soft)" },
    green: { b: "var(--green)", bg: "var(--green-soft)" },
    purple: { b: "var(--purple)", bg: "var(--purple-soft)" },
  }[color];
  return (
    <Link href={href} className="card group relative p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] active:scale-[0.98]"
      style={{ borderBottomWidth: 4, borderBottomColor: map.b }}>
      <span className="absolute right-4 top-4 text-[var(--text-dim)] transition group-hover:translate-x-0.5">›</span>
      <span className="mb-6 grid h-14 w-14 place-items-center rounded-2xl transition group-hover:scale-105" style={{ background: map.bg, color: map.b }}>
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <div className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-wide">{title}</div>
      <div className="mt-1 text-[13px] font-semibold text-[var(--text-dim)]">{sub}</div>
    </Link>
  );
}
