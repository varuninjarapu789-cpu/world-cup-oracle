"use client";

/* =============================================================================
   Oracle orchestrator (client). Owns every piece of interactive state: the two
   selected teams, neutral-ground flag, slider positions, and the customisable
   reset baseline. Team changes recompute the analysis via a server action;
   sliders and the neutral toggle re-run the pure predict() instantly.
============================================================================= */
import { useMemo, useState, useTransition } from "react";
import {
  predict,
  type FixtureAnalysis,
  type H2HStats,
  type LatestMeeting,
  type TeamForm,
} from "@/lib/oracle";
import { analyzeFixtureAction } from "./actions";
import { TeamSelect } from "./team-select";
import { StageSelect } from "./stage-select";
import { VenueSelect } from "./venue-select";
import { ControlMatrix, type Sliders } from "./control-matrix";
import { VisualIntelligence } from "./visual-intelligence";
import { getKit, TeamJersey, FlagStripe, KitGlow } from "./team-kits";
import { ImpactVault } from "./impact-vault";

const FIXTURE = {
  competition: "FIFA WORLD CUP 2026",
};

const DEFAULT_VENUE = "East Rutherford, United States"; // MetLife Stadium

// Single source of truth: each stage carries its projected slot and whether it
// is a knockout (no-draw) tie. Drives the dropdown, the date, and predict().
// 48-team 2026 sequence. "Group Stage" subsumes all three matchdays (the model
// uses full H2H history regardless), so no matchday strings reach the UI.
const STAGES = [
  { label: "Group Stage", date: "20 JUN 2026 · 19:00", knockout: false },
  { label: "Round of 32", date: "29 JUN 2026 · 20:00", knockout: true },
  { label: "Round of 16", date: "05 JUL 2026 · 20:00", knockout: true },
  { label: "Quarter-Finals", date: "10 JUL 2026 · 20:00", knockout: true },
  { label: "Semi-Finals", date: "14 JUL 2026 · 21:00", knockout: true },
  { label: "Final", date: "19 JUL 2026 · 15:00", knockout: true },
] as const;

const STAGE_LABELS = STAGES.map((s) => s.label);
const DEFAULT_STAGE = STAGES[0]; // Group Stage

const DEFAULT_SLIDERS: Sliders = { historical: 65, form: 50, chaos: 20 };

const code = (name: string) => name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();

export function OracleApp({
  teams,
  venues,
  initialTeams,
  initialAnalysis,
  initialLatestMeeting,
  initialBattlegrounds,
}: {
  teams: string[];
  venues: string[];
  initialTeams: { a: string; b: string };
  initialAnalysis: FixtureAnalysis;
  initialLatestMeeting: LatestMeeting | null;
  initialBattlegrounds: string[];
}) {
  const [teamA, setTeamA] = useState(initialTeams.a);
  const [teamB, setTeamB] = useState(initialTeams.b);
  const [neutral, setNeutral] = useState(true);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [latestMeeting, setLatestMeeting] = useState(initialLatestMeeting);
  const [battlegrounds, setBattlegrounds] = useState(initialBattlegrounds);
  const [sliders, setSliders] = useState<Sliders>(DEFAULT_SLIDERS);
  const [defaults, setDefaults] = useState<Sliders>(DEFAULT_SLIDERS);
  const [stage, setStage] = useState<string>(DEFAULT_STAGE.label);
  const [matchDate, setMatchDate] = useState<string>(DEFAULT_STAGE.date);
  const [venue, setVenue] = useState(DEFAULT_VENUE);
  const [pending, startTransition] = useTransition();

  const knockout = (STAGES.find((s) => s.label === stage) ?? DEFAULT_STAGE).knockout;

  const prediction = useMemo(
    () =>
      predict(
        analysis,
        { historical: sliders.historical / 100, form: sliders.form / 100, chaos: sliders.chaos / 100 },
        neutral,
        knockout,
      ),
    [analysis, sliders, neutral, knockout],
  );

  // Selecting a stage auto-fills the date with its projected tournament slot.
  const pickStage = (label: string) => {
    setStage(label);
    const next = STAGES.find((s) => s.label === label);
    if (next) setMatchDate(next.date);
  };

  const pick = (side: "a" | "b", team: string) => {
    const a = side === "a" ? team : teamA;
    const b = side === "b" ? team : teamB;
    if (side === "a") setTeamA(team);
    else setTeamB(team);
    startTransition(async () => {
      const res = await analyzeFixtureAction(a, b);
      setAnalysis(res.analysis);
      setLatestMeeting(res.latestMeeting);
      setBattlegrounds(res.battlegrounds);
    });
  };

  const isBaseline =
    sliders.historical === defaults.historical &&
    sliders.form === defaults.form &&
    sliders.chaos === defaults.chaos;

  // Clash-aware kits: when both primary colors match, the away side (B) wears its secondary.
  const kitA = getKit(teamA);
  const kitB = getKit(teamB);
  const kitBFill =
    kitA.primary.toLowerCase() === kitB.primary.toLowerCase() ? kitB.secondary : kitB.primary;

  return (
    <>
    <section className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      {/* LEFT — matchup canvas */}
      <div className="flex flex-col justify-between gap-10 border-line/80 px-6 py-12 sm:px-10 lg:border-r lg:py-16">
        <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[0.62rem] uppercase tracking-[0.22em] text-faint">
          <dd className="text-copper">{FIXTURE.competition}</dd>
          <dd>
            <StageSelect value={stage} options={STAGE_LABELS} onChange={pickStage} />
          </dd>
          <dd className="ml-auto hidden sm:block">
            <InlineInput value={matchDate} onChange={setMatchDate} ariaLabel="Match date and kickoff time" />
          </dd>
        </dl>

        <div className={`-mt-2 transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}>
          {/* Clash-aware kits: if both primaries match, the away side (B) flips to its secondary. */}
          <div className="relative">
            <KitGlow color={kitA.primary} />
            <div className="flex items-start gap-3">
              <TeamJersey fill={kitA.primary} className="mt-1 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <TeamSelect
                  value={teamA}
                  options={teams.filter((t) => t !== teamB)}
                  onChange={(t) => pick("a", t)}
                  index="01"
                  accent="copper"
                />
                <FormMeta form={analysis.formA} />
              </div>
            </div>
            <FlagStripe colors={kitA.flag} />
          </div>

          <Versus />

          <div className="relative">
            <KitGlow color={kitB.primary} />
            <div className="flex items-start gap-3">
              <TeamJersey fill={kitBFill} className="mt-1 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <TeamSelect
                  value={teamB}
                  options={teams.filter((t) => t !== teamA)}
                  onChange={(t) => pick("b", t)}
                  index="02"
                  accent="plum"
                />
                <FormMeta form={analysis.formB} />
              </div>
            </div>
            <FlagStripe colors={kitB.flag} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <NeutralToggle neutral={neutral} onToggle={() => setNeutral((n) => !n)} host={teamA} />

          <LatestMeetingCard meeting={latestMeeting} pending={pending} />

          <MatchStats stats={analysis.stats} codeA={code(teamA)} codeB={code(teamB)} pending={pending} />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.62rem] uppercase tracking-[0.22em] text-faint">
            <span aria-hidden className="hidden h-px w-10 bg-line sm:block" />
            {neutral ? (
              <VenueSelect value={venue} options={venues} battlegrounds={battlegrounds} onChange={setVenue} />
            ) : (
              <span aria-disabled className="cursor-not-allowed text-faint/70 select-none">
                {teamA} (Home Ground)
              </span>
            )}
            <span className="ml-auto">
              {analysis.h2hMatches} prior {analysis.h2hMatches === 1 ? "meeting" : "meetings"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT — control matrix */}
      <ControlMatrix
        prediction={prediction}
        codes={{ a: code(teamA), b: code(teamB) }}
        knockout={knockout}
        sliders={sliders}
        onSlider={(key, value) => setSliders((s) => ({ ...s, [key]: value }))}
        onReset={() => setSliders(defaults)}
        onSetDefault={() => setDefaults(sliders)}
        isBaseline={isBaseline}
        pending={pending}
      />
    </section>

    <VisualIntelligence
      chaos={sliders.chaos}
      dots={analysis.meetingDots}
      knockout={knockout}
      prediction={prediction}
      teamA={teamA}
      teamB={teamB}
    />

    <ImpactVault teamA={teamA} teamB={teamB} />
    </>
  );
}

function FormMeta({ form }: { form: TeamForm }) {
  const tone: Record<"W" | "D" | "L", string> = { W: "bg-copper", D: "bg-faint", L: "bg-line" };
  const chronological = [...form.results].reverse();
  return (
    <div className="mt-2 flex items-center gap-4 pl-9 text-[0.62rem] uppercase tracking-[0.2em] text-faint">
      <span>
        Form <span className="text-muted">{Math.round(form.score * 100)}%</span>
      </span>
      <span aria-hidden className="h-3 w-px bg-line" />
      <span className="flex items-center gap-1" aria-label={`Recent form ${chronological.join(" ")}`}>
        {chronological.length === 0 ? (
          <span className="text-faint">no data</span>
        ) : (
          chronological.map((r, i) => <span key={i} aria-hidden className={`block size-1.5 ${tone[r]}`} />)
        )}
      </span>
    </div>
  );
}

// Inline, editable label (date / venue). Looks like the surrounding text until
// hovered or focused, then reveals an underline affordance. Auto-sizes to value.
function InlineInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  // Mono font: 1ch per glyph, plus the 0.22em letter-spacing after each one, so
  // the field hugs its content without clipping the trailing characters.
  const n = Math.max(value.length, 6);
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      spellCheck={false}
      style={{ width: `calc(${n}ch + ${n} * 0.22em + 0.75em)` }}
      className="max-w-full border-b border-dashed border-transparent bg-transparent font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted outline-none transition-colors hover:border-line hover:text-ink focus:border-copper focus:text-copper"
    />
  );
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? ""} ${y}`;
}

function LatestMeetingCard({
  meeting,
  pending,
}: {
  meeting: LatestMeeting | null;
  pending: boolean;
}) {
  if (!meeting) {
    return (
      <div
        className={`flex flex-col items-center gap-1.5 border border-line/80 px-4 py-7 text-center transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}
      >
        <span className="text-[0.56rem] uppercase tracking-[0.22em] text-faint">Latest Meeting</span>
        <span className="font-display text-base font-bold uppercase tracking-tight text-muted">
          First Historic Meeting
        </span>
        <span className="text-[0.56rem] uppercase tracking-[0.22em] text-faint">No Prior Data</span>
      </div>
    );
  }

  const homeWon = meeting.homeScore > meeting.awayScore;
  const awayWon = meeting.awayScore > meeting.homeScore;
  const winner = "font-extrabold text-ink";
  const other = "font-medium text-muted";
  const venue = [meeting.city, meeting.country].filter(Boolean).join(", ");

  return (
    <div className={`border border-line/80 transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line/80 px-4 py-2.5 text-[0.56rem] uppercase tracking-[0.2em]">
        <span className="shrink-0 text-faint">Latest Meeting</span>
        <span className="min-w-0 truncate text-copper">{meeting.tournament}</span>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-5">
        <span
          className={`min-w-0 flex-1 truncate text-right font-display text-lg uppercase tracking-tight ${homeWon ? winner : other}`}
        >
          {meeting.home}
        </span>
        <span className="shrink-0 font-display text-xl font-bold tabular-nums tracking-tight text-copper">
          {meeting.homeScore} · {meeting.awayScore}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-left font-display text-lg uppercase tracking-tight ${awayWon ? winner : other}`}
        >
          {meeting.away}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line/80 px-4 py-2.5 text-[0.56rem] uppercase tracking-[0.18em] text-faint">
        <span className="shrink-0">{formatDate(meeting.date)}</span>
        <span className="min-w-0 truncate">{venue}</span>
      </div>
    </div>
  );
}

function MatchStats({
  stats,
  codeA,
  codeB,
  pending,
}: {
  stats: H2HStats;
  codeA: string;
  codeB: string;
  pending: boolean;
}) {
  const { avgGoals, cleanSheetsA, cleanSheetsB, worldCup, blowout } = stats;
  const has = blowout !== null;
  return (
    <div className={`border border-line/80 transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-3">
        <StatCell label="Avg Goals" value={has ? avgGoals.toFixed(1) : "—"} hint="per match" />
        <StatCell
          label="Clean Sheets"
          value={has ? `${codeA} ${cleanSheetsA} · ${codeB} ${cleanSheetsB}` : "—"}
          hint="shut-outs"
        />
        <StatCell
          label="World Cup"
          value={worldCup.total ? `${worldCup.win}·${worldCup.draw}·${worldCup.loss}` : "—"}
          hint={worldCup.total ? "W · D · L" : "no finals"}
        />
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line/80 px-4 py-3">
        <span className="shrink-0 text-[0.58rem] uppercase tracking-[0.2em] text-faint">Historic Blowout</span>
        {blowout ? (
          <span className="min-w-0 truncate font-mono text-[0.72rem] uppercase tracking-[0.08em] text-ink">
            {blowout.label} <span className="text-faint">· {blowout.year}</span>
          </span>
        ) : (
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.08em] text-faint">No prior meetings</span>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-line/80 px-4 py-3 first:border-l-0">
      <span className="text-[0.56rem] uppercase tracking-[0.18em] text-faint">{label}</span>
      <span className="font-display text-lg font-bold tabular-nums tracking-tight text-ink">{value}</span>
      <span className="text-[0.5rem] uppercase tracking-[0.16em] text-faint">{hint}</span>
    </div>
  );
}

function Versus() {
  return (
    <div className="flex items-center gap-4 py-3 pl-9">
      <span aria-hidden className="h-px w-8 bg-copper/70" />
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.5em] text-copper">vs</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

function NeutralToggle({
  neutral,
  onToggle,
  host,
}: {
  neutral: boolean;
  onToggle: () => void;
  host: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={neutral}
        onClick={onToggle}
        className="group flex items-center gap-3 focus-visible:outline-none"
      >
        <span
          className={`relative flex h-5 w-10 shrink-0 items-center border transition-colors duration-200 ${
            neutral ? "border-copper/70 bg-copper/15" : "border-line bg-transparent"
          } group-focus-visible:border-copper`}
        >
          <span
            className={`block size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none ${
              neutral ? "translate-x-[1.375rem] bg-copper" : "translate-x-[0.125rem] bg-faint"
            }`}
          />
        </span>
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink">
          Neutral Ground
        </span>
      </button>
      <span className="text-[0.58rem] uppercase tracking-[0.18em] text-faint">
        {neutral ? "Neutral venue" : `${host} home · +20% edge`}
      </span>
    </div>
  );
}
