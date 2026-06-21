// One-click data refresh pipeline.
//
// Pulls the latest international-results CSV from the upstream repo, validates
// it, safely overwrites data/results.csv, then rebuilds so the dashboard
// re-prerenders with the fresh rows. The build re-reads the data through
// loadResults(), which applies our strict (date + sorted teams) de-duplication
// at read time — so the on-disk file stays the raw upstream source of truth
// while the rendered output is sanitized.
//
// NOTE: the source repo is "international_results" (underscore). The hyphenated
// "international-football-results" name 404s.
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const SOURCE_URL =
  "https://raw.githubusercontent.com/martj42/international_results/master/results.csv";
const TARGET = path.join(__dirname, "..", "data", "results.csv");
const EXPECTED_HEADER =
  "date,home_team,away_team,home_score,away_score,tournament,city,country,neutral";

async function main() {
  console.log(`↓  Fetching ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`upstream returned HTTP ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();

  // Validate BEFORE touching the local file, so a 404 page / truncated body /
  // network blip can never clobber known-good data.
  const header = csv.slice(0, csv.indexOf("\n")).trim();
  if (header !== EXPECTED_HEADER) {
    throw new Error(`unexpected CSV header, refusing to overwrite\n   got: ${header.slice(0, 90)}`);
  }
  const rows = csv.split("\n").filter(Boolean).length - 1; // minus header
  if (rows < 1000) {
    throw new Error(`only ${rows} rows fetched — looks truncated, aborting`);
  }

  // Atomic-ish write: stage to a temp file, then rename over the target.
  const tmp = `${TARGET}.tmp`;
  fs.writeFileSync(tmp, csv);
  fs.renameSync(tmp, TARGET);

  const bytes = fs.statSync(TARGET).size;
  console.log(
    `✓  Updated data/results.csv — ${rows.toLocaleString()} rows, ${(bytes / 1024 / 1024).toFixed(2)} MB`,
  );

  // Re-prerender the dashboard with the new data points.
  console.log("→  Rebuilding dashboard (npm run build)…\n");
  execSync("npm run build", { stdio: "inherit" });
  console.log("\n✓  Data refresh complete.");
}

main().catch((err) => {
  console.error(`✗  update-data failed: ${err.message}`);
  process.exit(1);
});
