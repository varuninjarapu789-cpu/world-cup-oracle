// World Cup Oracle — prediction engine (pure, isomorphic).
//
// No I/O lives here. The expensive analysis runs once on the server over
// already-parsed matches; `predict()` is cheap and pure so it can re-run live
// in the browser every time a slider moves. Keeping this file free of `fs`
// lets the client import `predict` without pulling the 3.6 MB CSV.

export type MatchRow = {
  date: string; // ISO yyyy-mm-dd, ascending in source
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  tournament: string; // e.g. "FIFA World Cup", "Friendly"
  competitive: boolean; // tournament !== "Friendly"
  neutral: boolean;
};

/** A single completed match with venue, for the "latest meeting" card. */
export type LatestMeeting = {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  tournament: string;
  city: string;
  country: string;
};

/** A probability split over the three outcomes, from Team A's point of view. Sums to 1. */
export type Triplet = { win: number; draw: number; loss: number };

export type TeamForm = {
  team: string;
  results: ("W" | "D" | "L")[]; // most-recent-first, up to 5
  score: number; // momentum in [0,1] = points / 15 (W=3, D=1, L=0)
};

/** Largest-margin meeting, pre-formatted for display. */
export type Blowout = { label: string; year: string; winner: string; margin: number };

/** Descriptive head-to-head record over every past meeting (no weighting). */
export type H2HStats = {
  avgGoals: number; // average total goals per meeting
  cleanSheetsA: number; // times A held B scoreless
  cleanSheetsB: number; // times B held A scoreless
  worldCup: { win: number; draw: number; loss: number; total: number }; // strictly "FIFA World Cup", A's POV
  blowout: Blowout | null;
};

/** A team's data-derived context profile, used by the boosting layer. */
export type TeamContext = {
  strength: number; // competitive (non-friendly) win rate, 0..1 — the global-rate fallback
  pressureDelta: number; // World Cup win rate − strength (knockout temperament), clamped
  neutralDelta: number; // neutral-ground win rate − overall win rate (travels well), clamped
};

export type FixtureAnalysis = {
  teamA: string;
  teamB: string;
  h2h: Triplet; // weighted historical head-to-head, A's POV
  h2hMatches: number; // raw count of past meetings
  stats: H2HStats;
  formA: TeamForm;
  formB: TeamForm;
  contextA: TeamContext;
  contextB: TeamContext;
  meetingDots: { diff: number; year: number }[]; // every past meeting, for the gravity well
};

/** Slider positions, each normalised to 0..1. */
export type Weights = { historical: number; form: number; chaos: number };

/** Final projection: A win / draw / B win. Sums to 1. */
export type Prediction = { win: number; draw: number; loss: number };

// --- tuning constants (named, not magic) -----------------------------------
const COMPETITIVE_MULTIPLIER = 3; // World Cup-type matches weigh 3x friendlies
const DECAY_PER_DECADE = 0.2; // recency: lose 20% of weight per decade of age
const DECAY_FLOOR = 0.1; // ancient history keeps at least 10% of its weight
const HOME_EDGE = 0.15; // share of a non-neutral result attributed to venue
const DRAW_BASE = 0.26; // baseline international draw rate (form model)
const FORM_AMPLIFY = 0.6; // max multiplicative momentum swing at Recent Form = 100%
const H2H_PRIOR = 1.0; // Laplace smoothing toward a neutral prior
const HOME_ADVANTAGE = 0.12; // additive home tilt to Team A when not on neutral ground
const KNOCKOUT_RESOLVE = 0.7; // how much a knockout tiebreak follows strength vs. a coin flip
const CTX_PRESSURE = 0.5; // weight of the knockout-temperament context correction
const CTX_NEUTRAL = 0.5; // weight of the neutral-ground context correction
const CTX_MIN_SAMPLE = 5; // min matches in a bucket before a delta is trusted

// Neutral prior used both for smoothing and as the no-history fallback.
const PRIOR: Triplet = { win: (1 - DRAW_BASE) / 2, draw: DRAW_BASE, loss: (1 - DRAW_BASE) / 2 };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

// Clamp negatives and rescale so the triplet stays in [0,1] and sums to exactly 1.
function normalize(t: Triplet): Prediction {
  const win = t.win < 0 ? 0 : t.win;
  const draw = t.draw < 0 ? 0 : t.draw;
  const loss = t.loss < 0 ? 0 : t.loss;
  const s = win + draw + loss;
  if (s <= 0) return { win: 1 / 3, draw: 1 / 3, loss: 1 / 3 };
  return { win: win / s, draw: draw / s, loss: loss / s };
}

// Global-rate fallback when two teams have never met: a triplet seeded from each
// side's competitive win rate (their "global competitive win rate").
function strengthTriplet(strengthA: number, strengthB: number): Triplet {
  const rem = 1 - DRAW_BASE;
  const total = strengthA + strengthB;
  if (total <= 0) return { ...PRIOR };
  return { win: (rem * strengthA) / total, draw: DRAW_BASE, loss: (rem * strengthB) / total };
}

// Recency decay: a match this year keeps 100% of its weight and loses 20% per
// decade of age, smoothly, down to a 10% floor. Reference is the current year,
// so "recent" stays recent over time.
const NOW_YEAR = new Date().getFullYear();
function recencyWeight(date: string): number {
  const age = NOW_YEAR - Number(date.slice(0, 4));
  const w = 1 - (DECAY_PER_DECADE * age) / 10;
  return w < DECAY_FLOOR ? DECAY_FLOOR : w > 1 ? 1 : w;
}

function outcomeFor(team: string, m: MatchRow): "W" | "D" | "L" {
  const isHome = m.home === team;
  const scored = isHome ? m.homeScore : m.awayScore;
  const conceded = isHome ? m.awayScore : m.homeScore;
  return scored > conceded ? "W" : scored < conceded ? "L" : "D";
}

// Head-to-head: weighted W/D/L from A's POV. Each meeting's weight is its
// competitive multiplier (3x for non-friendlies) scaled by a recency decay, so
// a recent World Cup match far outweighs an ancient friendly.
// Neutral-ground logic: a non-neutral result is partly the venue's doing, so we
// regress the home side's result one notch softer (W→D→L) and reward the away
// side one notch harder (L→D→W), by HOME_EDGE. Neutral matches are untouched.
function headToHead(meetings: MatchRow[], a: string): Triplet {
  let w = 0;
  let d = 0;
  let l = 0;

  for (const m of meetings) {
    const weight = (m.competitive ? COMPETITIVE_MULTIPLIER : 1) * recencyWeight(m.date);
    const o = outcomeFor(a, m);

    // one-hot credit for this result
    let cw = o === "W" ? 1 : 0;
    let cd = o === "D" ? 1 : 0;
    let cl = o === "L" ? 1 : 0;

    if (!m.neutral) {
      const aHome = m.home === a;
      if (aHome) {
        // shift HOME_EDGE one notch softer: W→D, D→L
        const fromW = cw * HOME_EDGE;
        const fromD = cd * HOME_EDGE;
        cw -= fromW;
        cd += fromW - fromD;
        cl += fromD;
      } else {
        // shift HOME_EDGE one notch harder: L→D, D→W
        const fromL = cl * HOME_EDGE;
        const fromD = cd * HOME_EDGE;
        cl -= fromL;
        cd += fromL - fromD;
        cw += fromD;
      }
    }

    w += weight * cw;
    d += weight * cd;
    l += weight * cl;
  }

  // Laplace smoothing toward the neutral prior (also the zero-history fallback).
  w += H2H_PRIOR * PRIOR.win;
  d += H2H_PRIOR * PRIOR.draw;
  l += H2H_PRIOR * PRIOR.loss;
  const total = w + d + l;

  return { win: w / total, draw: d / total, loss: l / total };
}

// Descriptive (unweighted) head-to-head record over every past meeting.
function h2hStats(meetings: MatchRow[], a: string): H2HStats {
  let goals = 0;
  let cleanSheetsA = 0;
  let cleanSheetsB = 0;
  const worldCup = { win: 0, draw: 0, loss: 0, total: 0 };
  let blow: MatchRow | null = null;
  let blowMargin = -1;

  for (const m of meetings) {
    goals += m.homeScore + m.awayScore;

    const aHome = m.home === a;
    const aGoals = aHome ? m.homeScore : m.awayScore;
    const bGoals = aHome ? m.awayScore : m.homeScore;
    if (bGoals === 0) cleanSheetsA++; // A shut out B
    if (aGoals === 0) cleanSheetsB++; // B shut out A

    if (m.tournament === "FIFA World Cup") {
      worldCup.total++;
      if (aGoals > bGoals) worldCup.win++;
      else if (aGoals < bGoals) worldCup.loss++;
      else worldCup.draw++;
    }

    const margin = Math.abs(m.homeScore - m.awayScore);
    if (margin > blowMargin) {
      blowMargin = margin;
      blow = m;
    }
  }

  return {
    avgGoals: meetings.length ? goals / meetings.length : 0,
    cleanSheetsA,
    cleanSheetsB,
    worldCup,
    blowout: blow ? formatBlowout(blow) : null,
  };
}

function formatBlowout(m: MatchRow): Blowout {
  const year = m.date.slice(0, 4);
  const hi = Math.max(m.homeScore, m.awayScore);
  const lo = Math.min(m.homeScore, m.awayScore);
  if (m.homeScore === m.awayScore) {
    return { label: `${m.home} ${m.homeScore}–${m.awayScore} ${m.away}`, year, winner: "Draw", margin: 0 };
  }
  const winner = m.homeScore > m.awayScore ? m.home : m.away;
  const loser = m.homeScore > m.awayScore ? m.away : m.home;
  return { label: `${winner} ${hi}–${lo} ${loser}`, year, winner, margin: hi - lo };
}

// Last 5 completed matches for a team, most-recent-first. Source is ascending,
// so we scan from the end and stop at 5.
function recentForm(matches: MatchRow[], team: string): TeamForm {
  const results: ("W" | "D" | "L")[] = [];
  for (let i = matches.length - 1; i >= 0 && results.length < 5; i--) {
    const m = matches[i];
    if (m.home !== team && m.away !== team) continue;
    results.push(outcomeFor(team, m));
  }
  const points = results.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  return { team, results, score: results.length ? points / 15 : 0.5 };
}

// Data-derived context profile: a team's competitive strength plus how it shifts
// in high-pressure World Cup matches and on neutral ground. One pass per team.
function teamContext(matches: MatchRow[], team: string): TeamContext {
  let total = 0;
  let wins = 0;
  let comp = 0;
  let compWins = 0;
  let wc = 0;
  let wcWins = 0;
  let neu = 0;
  let neuWins = 0;

  for (const m of matches) {
    if (m.home !== team && m.away !== team) continue;
    total++;
    const won = outcomeFor(team, m) === "W";
    if (won) wins++;
    if (m.competitive) {
      comp++;
      if (won) compWins++;
    }
    if (m.tournament === "FIFA World Cup") {
      wc++;
      if (won) wcWins++;
    }
    if (m.neutral) {
      neu++;
      if (won) neuWins++;
    }
  }

  const overall = total ? wins / total : 0.5;
  const strength = comp ? compWins / comp : overall;
  return {
    strength,
    pressureDelta: wc >= CTX_MIN_SAMPLE ? clamp(wcWins / wc - strength, -0.4, 0.4) : 0,
    neutralDelta: neu >= CTX_MIN_SAMPLE ? clamp(neuWins / neu - overall, -0.4, 0.4) : 0,
  };
}

export function analyzeFixture(matches: MatchRow[], teamA: string, teamB: string): FixtureAnalysis {
  const meetings = matches.filter(
    (m) =>
      (m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA),
  );
  return {
    teamA,
    teamB,
    h2h: headToHead(meetings, teamA),
    h2hMatches: meetings.length,
    stats: h2hStats(meetings, teamA),
    formA: recentForm(matches, teamA),
    formB: recentForm(matches, teamB),
    contextA: teamContext(matches, teamA),
    contextB: teamContext(matches, teamB),
    meetingDots: meetings.map((m) => ({
      diff: Math.abs(m.homeScore - m.awayScore),
      year: Number(m.date.slice(0, 4)),
    })),
  };
}

// Sequential boosting model (XGBoost-inspired): a base estimate, then additive
// residual corrections layered on top. Pure and cheap, so it re-runs live on the
// client as sliders/toggles move. Output is always bounded [0,1] and sums to 1.
//
//   Base Layer    — historical head-to-head, or each team's global competitive
//                   win rate when the pair has never met, mixed with recent-form
//                   prior by Historical Weight (H).
//   Boost Layer 1 — context corrections from the live simulation parameters
//                   (knockout tier, neutral/home), weighted by how each team
//                   historically behaves in those environments.
//   Boost Layer 2 — the user's manual sliders (Form, Home edge, Chaos) as final
//                   residual adjusters.
export function predict(
  a: FixtureAnalysis,
  w: Weights,
  neutral: boolean,
  knockout: boolean,
): Prediction {
  const H = clamp01(w.historical);
  const R = clamp01(w.form);
  const C = clamp01(w.chaos);
  const tilt = a.formA.score - a.formB.score; // momentum differential [-1, 1]

  // ---- BASE LAYER ----------------------------------------------------------
  const base = a.h2hMatches > 0 ? a.h2h : strengthTriplet(a.contextA.strength, a.contextB.strength);
  const rem = 1 - DRAW_BASE;
  const formPrior: Triplet = {
    win: (rem * (1 + tilt)) / 2,
    draw: DRAW_BASE,
    loss: (rem * (1 - tilt)) / 2,
  };
  let p = normalize({
    win: H * base.win + (1 - H) * formPrior.win,
    draw: H * base.draw + (1 - H) * formPrior.draw,
    loss: H * base.loss + (1 - H) * formPrior.loss,
  });

  // ---- BOOST LAYER 1: CONTEXT CORRECTIONS ----------------------------------
  let { win, draw, loss } = p;
  if (knockout) {
    win += CTX_PRESSURE * a.contextA.pressureDelta;
    loss += CTX_PRESSURE * a.contextB.pressureDelta;
  }
  if (neutral) {
    win += CTX_NEUTRAL * a.contextA.neutralDelta;
    loss += CTX_NEUTRAL * a.contextB.neutralDelta;
  } else {
    // Team A hosts: additive home boost, slight away penalty.
    win += HOME_ADVANTAGE;
    loss -= HOME_ADVANTAGE * 0.5;
  }
  p = normalize({ win, draw, loss });

  // ---- BOOST LAYER 2: DYNAMIC MOMENTUM CORRECTIONS (sliders) ---------------
  ({ win, draw, loss } = p);
  win *= 1 + R * FORM_AMPLIFY * tilt; // Recent Form residual
  loss *= 1 - R * FORM_AMPLIFY * tilt;
  p = normalize({ win, draw, loss });
  ({ win, draw, loss } = p);

  if (knockout) {
    // No draws: resolve the tie (ET/penalties, stronger side favoured but
    // compressed toward a coin flip), then Chaos flattens the two-way advance.
    const denom = win + loss;
    const edgeA = denom > 0 ? win / denom : 0.5;
    const advanceA = 0.5 + (edgeA - 0.5) * KNOCKOUT_RESOLVE;
    win += draw * advanceA;
    loss += draw * (1 - advanceA);
    draw = 0;
    win = (1 - C) * win + C / 2;
    loss = (1 - C) * loss + C / 2;
  } else {
    // Chaos pulls the three-way split toward uniform.
    win = (1 - C) * win + C / 3;
    draw = (1 - C) * draw + C / 3;
    loss = (1 - C) * loss + C / 3;
  }

  return normalize({ win, draw, loss });
}
