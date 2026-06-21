"use server";

// Recomputes the fixture analysis (and latest meeting) when the user picks new
// teams. Runs on the server so the 3.6 MB dataset never reaches the client;
// only the small result objects cross the wire.
import { analyzeFixture, type FixtureAnalysis, type LatestMeeting } from "@/lib/oracle";
import { getLatestMeeting, getMeetingVenues, loadResults } from "@/lib/results";

export async function analyzeFixtureAction(
  teamA: string,
  teamB: string,
): Promise<{
  analysis: FixtureAnalysis;
  latestMeeting: LatestMeeting | null;
  battlegrounds: string[];
}> {
  return {
    analysis: analyzeFixture(loadResults(), teamA, teamB),
    latestMeeting: getLatestMeeting(teamA, teamB),
    battlegrounds: getMeetingVenues(teamA, teamB),
  };
}
