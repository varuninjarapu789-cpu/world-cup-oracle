// Server-only adapter: reads data/results.csv and parses it into MatchRow[].
// Memoised at module scope so the 3.6 MB file is read and parsed once per server
// process, never shipped to the client.
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LatestMeeting, MatchRow } from "./oracle";

let cache: MatchRow[] | null = null;
let teamCache: string[] | null = null;
let venueCache: string[] | null = null;

// Quote-aware CSV field splitter. Needed for city/country (indices 6–7), which
// sit after quoted city names with embedded commas (e.g. "Washington, D.C.").
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else if (c === '"') {
      quoted = true;
    } else cur += c;
  }
  out.push(cur);
  return out;
}

// Every unique "City, Country" venue in the dataset, sorted. De-duped
// case-insensitively (first canonical spelling wins), trimmed of artifacts.
export function getVenues(): string[] {
  if (venueCache) return venueCache;

  const csv = readFileSync(join(process.cwd(), "data", "results.csv"), "utf8");
  const lines = csv.split("\n");
  const seen = new Set<string>();
  const venues: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const f = parseCsvLine(line);
    if (f.length < 8) continue;
    const city = f[6].trim();
    const country = f[7].trim();
    if (!city || !country) continue;
    const label = `${city}, ${country}`;
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      venues.push(label);
    }
  }

  venueCache = venues.sort((a, b) => a.localeCompare(b));
  return venueCache;
}

// Every country that appears in the dataset (home or away), sorted. Includes
// teams that only appear in unplayed fixtures, so the picker is complete.
export function getUniqueTeams(): string[] {
  if (teamCache) return teamCache;

  const csv = readFileSync(join(process.cwd(), "data", "results.csv"), "utf8");
  const lines = csv.split("\n");
  // De-dupe case-insensitively (keeping the first canonical spelling) and trim
  // whitespace, so no ghost entries slip through formatting artifacts.
  const seen = new Set<string>();
  const teams: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const f = line.split(","); // home/away precede any quoted city, so safe
    if (f.length < 9) continue;
    for (const name of [f[1].trim(), f[2].trim()]) {
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        teams.push(name);
      }
    }
  }

  teamCache = teams.sort((a, b) => a.localeCompare(b));
  return teamCache;
}

// The single most recent completed match between two teams, with full venue.
// Scans newest-first (the file is chronological) and returns the first hit;
// null if they have never played. Uses the quote-aware parser so city/country
// (indices 6–7, after quoted city names) are read correctly.
export function getLatestMeeting(teamA: string, teamB: string): LatestMeeting | null {
  const csv = readFileSync(join(process.cwd(), "data", "results.csv"), "utf8");
  const lines = csv.split("\n");

  for (let i = lines.length - 1; i >= 1; i--) {
    const line = lines[i];
    if (!line) continue;
    // cheap pre-filter before the heavier quote-aware parse
    if (!line.includes(teamA) || !line.includes(teamB)) continue;

    const f = parseCsvLine(line);
    if (f.length < 9) continue;
    const home = f[1].trim();
    const away = f[2].trim();
    const meeting =
      (home === teamA && away === teamB) || (home === teamB && away === teamA);
    if (!meeting) continue;

    const homeScore = Number(f[3]);
    const awayScore = Number(f[4]);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue; // unplayed fixture

    return {
      date: f[0].trim(),
      home,
      away,
      homeScore,
      awayScore,
      tournament: f[5].trim(),
      city: f[6].trim(),
      country: f[7].trim(),
    };
  }

  return null;
}

// Unique "City, Country" venues where two teams have played each other, ordered
// by frequency (most-played first, then alphabetical). Empty if they never met.
export function getMeetingVenues(teamA: string, teamB: string): string[] {
  const csv = readFileSync(join(process.cwd(), "data", "results.csv"), "utf8");
  const lines = csv.split("\n");
  const counts = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (!line.includes(teamA) || !line.includes(teamB)) continue;

    const f = parseCsvLine(line);
    if (f.length < 9) continue;
    const home = f[1].trim();
    const away = f[2].trim();
    if (!((home === teamA && away === teamB) || (home === teamB && away === teamA))) continue;

    const homeScore = Number(f[3]);
    const awayScore = Number(f[4]);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue; // played only

    const city = f[6].trim();
    const country = f[7].trim();
    if (!city || !country) continue;
    const label = `${city}, ${country}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label);
}

export function loadResults(): MatchRow[] {
  if (cache) return cache;

  const csv = readFileSync(join(process.cwd(), "data", "results.csv"), "utf8");
  const lines = csv.split("\n");
  const rows: MatchRow[] = [];

  // Strict de-dup: two national teams can't play twice on one calendar day, so
  // a key of date + the two team names sorted (home/away-agnostic) uniquely
  // identifies a meeting. The first row for a key wins; later collisions drop.
  const seen = new Set<string>();

  // Skip header (line 0). `neutral` is the last column, so quoted city names
  // with embedded commas can't shift the fields we read (indices 0–5).
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const f = line.split(",");
    if (f.length < 9) continue;

    const homeScore = Number(f[3]);
    const awayScore = Number(f[4]);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue; // unplayed fixtures

    const date = f[0].trim();
    const home = f[1].trim();
    const away = f[2].trim();
    const pair = home.toLowerCase() < away.toLowerCase() ? `${home}|${away}` : `${away}|${home}`;
    const key = `${date}|${pair.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      date,
      home,
      away,
      homeScore,
      awayScore,
      tournament: f[5].trim(),
      competitive: f[5].trim() !== "Friendly",
      neutral: f[f.length - 1].trim() === "TRUE",
    });
  }

  cache = rows;
  return rows;
}
