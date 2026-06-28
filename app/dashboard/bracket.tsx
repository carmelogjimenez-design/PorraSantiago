import type { ReactNode } from "react";

export type KoMatchVM = {
  round: string; order: number;
  homeName: string | null; homeFlag: string | null;
  awayName: string | null; awayFlag: string | null;
  homeScore: number | null; awayScore: number | null;
  status: string; kickoff: string | null;
};

// Códigos de selección (mismas colisiones resueltas que en el dashboard)
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
const abbr = (n: string | null) => (n ? (CODE[n] ?? n.slice(0, 3).toUpperCase()) : "");

// ---- Geometría del cuadro (coordenadas calculadas = líneas perfectas) ----
const PITCH = 162, CARDW = 130, CARDH = 44, SLOT0 = 64, PAD = 16, BODYTOP = 28;
const COLH = 8 * SLOT0;                       // alto de la columna de 16avos
const TOTAL_W = PAD * 2 + 9 * PITCH;          // 9 columnas visuales
const TOTAL_H = BODYTOP + COLH + 22;          // + hueco para la hora bajo la tarjeta
const N_PER_SIDE = [8, 4, 2, 1];              // 16avos, octavos, cuartos, semis (por lado)
const ROUND_KEYS = ["R32", "R16", "QF", "SF", "FIN"] as const;
const EXPECTED: Record<string, number> = { R32: 16, R16: 8, QF: 4, SF: 2, FIN: 1 };
const HEADERS = ["16avos", "Octavos", "Cuartos", "Semis", "Final", "Semis", "Cuartos", "Octavos", "16avos"];

const xCol = (colpos: number) => PAD + colpos * PITCH + CARDW / 2; // centro X de la columna
const slot = (r: number) => SLOT0 * Math.pow(2, r);
const yC = (r: number, i: number) => BODYTOP + slot(r) * (i + 0.5); // centro Y

function padTo(arr: (KoMatchVM | null)[], n: number): (KoMatchVM | null)[] {
  const a = arr.slice(0, n);
  while (a.length < n) a.push(null);
  return a;
}

const BK_CSS = `
.bk-sec{margin-top:8px}
.bk-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;padding-bottom:6px}
.bk-stage{position:relative}
.bk-hd{position:absolute;top:0;transform:translateX(-50%);font-family:var(--font-display),sans-serif;font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.bk-svg{position:absolute;inset:0;z-index:0;pointer-events:none}
.bk-card{position:absolute;z-index:1;box-sizing:border-box;border-radius:11px;background:var(--card);border:1px solid var(--border);box-shadow:0 1px 2px rgba(20,15,20,.04),0 10px 22px -16px rgba(20,15,20,.35);overflow:hidden}
.bk-card.empty{background:var(--soft);border-style:dashed;display:grid;place-items:center}
.bk-card.empty span{font-size:10px;font-weight:700;color:var(--text-dim);letter-spacing:.02em}
.bk-row{display:flex;align-items:center;gap:6px;height:50%;padding:0 8px}
.bk-row+.bk-row{border-top:1px solid var(--border)}
.bk-fl{width:18px;height:12px;border-radius:2px;object-fit:cover;flex:none;box-shadow:0 0 0 1px var(--border)}
.bk-fl.empty{display:inline-block;background:var(--soft)}
.bk-ab{font-family:var(--font-display),sans-serif;font-weight:800;font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bk-sc{font-family:var(--font-display),sans-serif;font-weight:800;font-size:13px;flex:none;color:var(--text-dim);font-variant-numeric:tabular-nums}
.bk-row.win .bk-ab{color:var(--accent-deep)}
.bk-row.win .bk-sc{color:var(--accent);}
.bk-when{position:absolute;z-index:1;text-align:center;font-size:9px;font-weight:700;color:var(--text-dim);line-height:1.1}
.bk-champ{position:absolute;z-index:2;transform:translateX(-50%);text-align:center}
.bk-champ .c-ic{font-size:20px;line-height:1}
.bk-champ .c-nm{margin-top:2px;font-family:var(--font-display),sans-serif;font-weight:800;font-size:12px;color:var(--accent-deep)}
.bk-hint{margin-top:4px;font-size:11px;color:var(--text-dim);font-weight:500}
`;

function Row({ flag, name, score, win, isPlaceholder }:
  { flag: string | null; name: string | null; score: number | null; win: boolean; isPlaceholder: boolean }) {
  return (
    <div className={`bk-row${win ? " win" : ""}`}>
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt={name ?? ""} className="bk-fl" />
      ) : (
        <span className="bk-fl empty" />
      )}
      <span className="bk-ab" style={isPlaceholder ? { color: "var(--text-dim)" } : undefined}>
        {isPlaceholder ? "—" : abbr(name)}
      </span>
      <span className="bk-sc">{score != null ? score : ""}</span>
    </div>
  );
}

function Card({ m, x, y }: { m: KoMatchVM | null; x: number; y: number }) {
  const left = x - CARDW / 2;
  const top = y - CARDH / 2;
  const base = { left, top, width: CARDW, height: CARDH } as const;

  if (!m || (!m.homeName && !m.awayName)) {
    return <div className="bk-card empty" style={base}><span>Por definir</span></div>;
  }
  const finished = m.status === "finished" && m.homeScore != null && m.awayScore != null;
  const homeWin = finished && (m.homeScore as number) > (m.awayScore as number);
  const awayWin = finished && (m.awayScore as number) > (m.homeScore as number);

  let when: ReactNode = null;
  if (!finished && m.kickoff) {
    const d = new Date(m.kickoff);
    const day = d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase();
    const time = d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
    when = (
      <div className="bk-when" style={{ left, top: top + CARDH + 1, width: CARDW }}>{day} · {time}</div>
    );
  }

  return (
    <>
      <div className="bk-card" style={base}>
        <Row flag={m.homeFlag} name={m.homeName} score={finished ? m.homeScore : null} win={homeWin} isPlaceholder={!m.homeName} />
        <Row flag={m.awayFlag} name={m.awayName} score={finished ? m.awayScore : null} win={awayWin} isPlaceholder={!m.awayName} />
      </div>
      {when}
    </>
  );
}

export default function Bracket({ matches }: { matches: KoMatchVM[] }) {
  // Agrupar por ronda, ordenar y rellenar hasta el nº esperado (huecos = null)
  const byRound: Record<string, (KoMatchVM | null)[]> = {};
  for (const k of ROUND_KEYS) byRound[k] = [];
  for (const m of matches) if (byRound[m.round]) byRound[m.round].push(m);
  for (const k of ROUND_KEYS) {
    byRound[k] = padTo(
      [...byRound[k]].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0)),
      EXPECTED[k]
    );
  }

  // Lado izquierdo (primera mitad) y derecho (segunda mitad) de cada ronda
  const leftRounds: (KoMatchVM | null)[][] = [];
  const rightRounds: (KoMatchVM | null)[][] = [];
  for (let r = 0; r < 4; r++) {
    const k = ROUND_KEYS[r];
    const half = EXPECTED[k] / 2;
    leftRounds[r] = byRound[k].slice(0, half);
    rightRounds[r] = byRound[k].slice(half);
  }
  const finalMatch = byRound["FIN"][0] ?? null;

  // ---- Tarjetas ----
  const cards: ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < N_PER_SIDE[r]; i++) {
      cards.push(<Card key={`L${r}-${i}`} m={leftRounds[r][i] ?? null} x={xCol(r)} y={yC(r, i)} />);
      cards.push(<Card key={`R${r}-${i}`} m={rightRounds[r][i] ?? null} x={xCol(8 - r)} y={yC(r, i)} />);
    }
  }
  cards.push(<Card key="FIN" m={finalMatch} x={xCol(4)} y={BODYTOP + 256} />);

  // ---- Campeón (si la final ya tiene marcador) ----
  let champ: ReactNode = null;
  if (finalMatch && finalMatch.status === "finished" && finalMatch.homeScore != null && finalMatch.awayScore != null) {
    const cName = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeName
      : finalMatch.awayScore > finalMatch.homeScore ? finalMatch.awayName : null;
    if (cName) {
      champ = (
        <div className="bk-champ" style={{ left: xCol(4), top: BODYTOP + 256 - CARDH / 2 - 44 }}>
          <div className="c-ic">🏆</div>
          <div className="c-nm">{abbr(cName)}</div>
        </div>
      );
    }
  }

  // ---- Líneas conectoras (coordenadas exactas) ----
  type Seg = { x1: number; y1: number; x2: number; y2: number };
  const segs: Seg[] = [];
  // izquierda: hijos a la izquierda
  for (let r = 1; r < 4; r++) {
    for (let i = 0; i < N_PER_SIDE[r]; i++) {
      const ya = yC(r - 1, 2 * i), yb = yC(r - 1, 2 * i + 1), yp = yC(r, i);
      const childRightX = xCol(r - 1) + CARDW / 2;
      const parentLeftX = xCol(r) - CARDW / 2;
      const midX = (childRightX + parentLeftX) / 2;
      segs.push({ x1: childRightX, y1: ya, x2: midX, y2: ya });
      segs.push({ x1: childRightX, y1: yb, x2: midX, y2: yb });
      segs.push({ x1: midX, y1: ya, x2: midX, y2: yb });
      segs.push({ x1: midX, y1: yp, x2: parentLeftX, y2: yp });
    }
  }
  // derecha: hijos a la derecha (espejo)
  for (let r = 1; r < 4; r++) {
    for (let i = 0; i < N_PER_SIDE[r]; i++) {
      const ya = yC(r - 1, 2 * i), yb = yC(r - 1, 2 * i + 1), yp = yC(r, i);
      const childLeftX = xCol(9 - r) - CARDW / 2;
      const parentRightX = xCol(8 - r) + CARDW / 2;
      const midX = (childLeftX + parentRightX) / 2;
      segs.push({ x1: childLeftX, y1: ya, x2: midX, y2: ya });
      segs.push({ x1: childLeftX, y1: yb, x2: midX, y2: yb });
      segs.push({ x1: midX, y1: ya, x2: midX, y2: yb });
      segs.push({ x1: midX, y1: yp, x2: parentRightX, y2: yp });
    }
  }
  // semis -> final (rectas, misma altura)
  const yFin = BODYTOP + 256;
  segs.push({ x1: xCol(3) + CARDW / 2, y1: yFin, x2: xCol(4) - CARDW / 2, y2: yFin });
  segs.push({ x1: xCol(5) - CARDW / 2, y1: yFin, x2: xCol(4) + CARDW / 2, y2: yFin });

  return (
    <div className="bk-sec">
      <style dangerouslySetInnerHTML={{ __html: BK_CSS }} />
      <div className="bk-scroll">
        <div className="bk-stage" style={{ width: TOTAL_W, height: TOTAL_H }}>
          {/* cabeceras de ronda */}
          {HEADERS.map((h, c) => (
            <div key={c} className="bk-hd" style={{ left: xCol(c) }}>{h}</div>
          ))}
          {/* líneas */}
          <svg className="bk-svg" width={TOTAL_W} height={TOTAL_H} viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}>
            {segs.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
            ))}
          </svg>
          {/* tarjetas + campeón */}
          {cards}
          {champ}
        </div>
      </div>
      <p className="bk-hint">Desliza para ver todo el cuadro. Los marcadores aparecen al acabar cada partido; el que pasa, en rojo. 👉</p>
    </div>
  );
}
