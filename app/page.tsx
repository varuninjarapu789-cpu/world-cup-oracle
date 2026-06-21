/* =============================================================================
   World Cup Oracle — server shell.
   Loads the team list and the initial (Brazil v Morocco) analysis at build
   time, then hands off to the client orchestrator for live, fully-dynamic play.
============================================================================= */
import { analyzeFixture } from "@/lib/oracle";
import {
  getLatestMeeting,
  getMeetingVenues,
  getUniqueTeams,
  getVenues,
  loadResults,
} from "@/lib/results";
import { OracleApp } from "./oracle-app";

const INITIAL = { a: "Brazil", b: "Morocco" };

export default function Home() {
  const teams = getUniqueTeams();
  const venues = getVenues();
  const initialAnalysis = analyzeFixture(loadResults(), INITIAL.a, INITIAL.b);
  const initialLatestMeeting = getLatestMeeting(INITIAL.a, INITIAL.b);
  const initialBattlegrounds = getMeetingVenues(INITIAL.a, INITIAL.b);

  return (
    <main className="relative isolate flex min-h-dvh flex-1 flex-col bg-canvas text-ink">
      <div aria-hidden className="dot-grid pointer-events-none fixed inset-0 -z-10" />

      <Masthead />
      <OracleApp
        teams={teams}
        venues={venues}
        initialTeams={INITIAL}
        initialAnalysis={initialAnalysis}
        initialLatestMeeting={initialLatestMeeting}
        initialBattlegrounds={initialBattlegrounds}
      />
      <Footer />
    </main>
  );
}

function Masthead() {
  return (
    <header className="border-b border-line/80">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="block size-2.5 shrink-0 bg-copper" />
          <span className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink sm:tracking-[0.32em]">
            World Cup Oracle
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-5 text-[0.62rem] uppercase tracking-[0.24em] text-faint">
          <span className="hidden sm:inline">Simulation Engine</span>
          <span aria-hidden className="hidden h-3 w-px bg-line sm:block" />
          <span className="flex items-center gap-2 text-muted">
            <span aria-hidden className="live-dot block size-1.5 rounded-full bg-copper" />
            <span className="hidden sm:inline">Live Model · </span>v0.2
          </span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/80">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 px-6 py-4 text-[0.58rem] uppercase tracking-[0.22em] text-faint sm:px-10">
        <span>Oracle Engine · Weighted Historical Projection</span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="block size-1.5 bg-copper" />
          Model live
        </span>
      </div>
    </footer>
  );
}
