/* =============================================================================
   Generational Icon Vault — curated player reference data.
   Hand-authored (not derived from the match dataset): legacy legends + active
   2026-era stars per nation, each with an Impact Metric block. "Clutch Rating"
   is an intentionally subjective 0–100 score; WC Goals / Trophies are factual.
============================================================================= */

export type ImpactMetric = { label: string; value: string };

export type Player = {
  name: string;
  era: string; // "1970s" … "Modern"
  number: number; // shirt number
  status: "legacy" | "active";
  metric: ImpactMetric;
};

export const PLAYERS: Record<string, Player[]> = {
  Brazil: [
    { name: "Pelé", era: "1960s", number: 10, status: "legacy", metric: { label: "WC Goals", value: "12" } },
    { name: "Ronaldo", era: "2000s", number: 9, status: "legacy", metric: { label: "WC Goals", value: "15" } },
    { name: "Ronaldinho", era: "2000s", number: 10, status: "legacy", metric: { label: "Trophies", value: "WC 2002" } },
    { name: "Vinícius Jr.", era: "Modern", number: 7, status: "active", metric: { label: "Clutch Rating", value: "92" } },
    { name: "Rodrygo", era: "Modern", number: 11, status: "active", metric: { label: "Clutch Rating", value: "85" } },
    { name: "Endrick", era: "Modern", number: 9, status: "active", metric: { label: "Clutch Rating", value: "80" } },
  ],
  Morocco: [
    { name: "Mustapha Hadji", era: "1990s", number: 10, status: "legacy", metric: { label: "Clutch Rating", value: "84" } },
    { name: "Noureddine Naybet", era: "1990s", number: 5, status: "legacy", metric: { label: "Clutch Rating", value: "81" } },
    { name: "Achraf Hakimi", era: "Modern", number: 2, status: "active", metric: { label: "Clutch Rating", value: "90" } },
    { name: "Sofyan Amrabat", era: "Modern", number: 4, status: "active", metric: { label: "Clutch Rating", value: "84" } },
    { name: "Youssef En-Nesyri", era: "Modern", number: 19, status: "active", metric: { label: "Clutch Rating", value: "83" } },
  ],
  Argentina: [
    { name: "Diego Maradona", era: "1980s", number: 10, status: "legacy", metric: { label: "WC Goals", value: "8" } },
    { name: "Gabriel Batistuta", era: "1990s", number: 9, status: "legacy", metric: { label: "WC Goals", value: "10" } },
    { name: "Lionel Messi", era: "Modern", number: 10, status: "active", metric: { label: "WC Goals", value: "13" } },
    { name: "Julián Álvarez", era: "Modern", number: 9, status: "active", metric: { label: "Clutch Rating", value: "88" } },
    { name: "Lautaro Martínez", era: "Modern", number: 22, status: "active", metric: { label: "Clutch Rating", value: "85" } },
  ],
  France: [
    { name: "Zinedine Zidane", era: "2000s", number: 10, status: "legacy", metric: { label: "Trophies", value: "WC 1998" } },
    { name: "Michel Platini", era: "1980s", number: 10, status: "legacy", metric: { label: "Clutch Rating", value: "90" } },
    { name: "Kylian Mbappé", era: "Modern", number: 10, status: "active", metric: { label: "WC Goals", value: "12" } },
    { name: "Antoine Griezmann", era: "Modern", number: 7, status: "active", metric: { label: "WC Goals", value: "6" } },
    { name: "Aurélien Tchouaméni", era: "Modern", number: 8, status: "active", metric: { label: "Clutch Rating", value: "84" } },
  ],
  Germany: [
    { name: "Franz Beckenbauer", era: "1970s", number: 5, status: "legacy", metric: { label: "Trophies", value: "WC 1974" } },
    { name: "Gerd Müller", era: "1970s", number: 13, status: "legacy", metric: { label: "WC Goals", value: "14" } },
    { name: "Miroslav Klose", era: "2000s", number: 11, status: "legacy", metric: { label: "WC Goals", value: "16" } },
    { name: "Jamal Musiala", era: "Modern", number: 10, status: "active", metric: { label: "Clutch Rating", value: "90" } },
    { name: "Florian Wirtz", era: "Modern", number: 17, status: "active", metric: { label: "Clutch Rating", value: "88" } },
  ],
  Portugal: [
    { name: "Eusébio", era: "1960s", number: 13, status: "legacy", metric: { label: "WC Goals", value: "9" } },
    { name: "Luís Figo", era: "2000s", number: 7, status: "legacy", metric: { label: "Clutch Rating", value: "88" } },
    { name: "Cristiano Ronaldo", era: "Modern", number: 7, status: "active", metric: { label: "WC Goals", value: "8" } },
    { name: "Bruno Fernandes", era: "Modern", number: 8, status: "active", metric: { label: "Clutch Rating", value: "86" } },
    { name: "Rafael Leão", era: "Modern", number: 10, status: "active", metric: { label: "Clutch Rating", value: "83" } },
  ],
  Spain: [
    { name: "Andrés Iniesta", era: "2010s", number: 6, status: "legacy", metric: { label: "Trophies", value: "WC 2010" } },
    { name: "Xavi", era: "2010s", number: 8, status: "legacy", metric: { label: "Clutch Rating", value: "90" } },
    { name: "Lamine Yamal", era: "Modern", number: 19, status: "active", metric: { label: "Clutch Rating", value: "91" } },
    { name: "Pedri", era: "Modern", number: 8, status: "active", metric: { label: "Clutch Rating", value: "88" } },
    { name: "Rodri", era: "Modern", number: 16, status: "active", metric: { label: "Trophies", value: "Euro 2024" } },
  ],
  England: [
    { name: "Bobby Charlton", era: "1960s", number: 9, status: "legacy", metric: { label: "Trophies", value: "WC 1966" } },
    { name: "Gary Lineker", era: "1980s", number: 10, status: "legacy", metric: { label: "WC Goals", value: "10" } },
    { name: "Jude Bellingham", era: "Modern", number: 10, status: "active", metric: { label: "Clutch Rating", value: "90" } },
    { name: "Harry Kane", era: "Modern", number: 9, status: "active", metric: { label: "WC Goals", value: "6" } },
    { name: "Bukayo Saka", era: "Modern", number: 7, status: "active", metric: { label: "Clutch Rating", value: "85" } },
  ],
  Netherlands: [
    { name: "Johan Cruyff", era: "1970s", number: 14, status: "legacy", metric: { label: "Clutch Rating", value: "95" } },
    { name: "Marco van Basten", era: "1980s", number: 9, status: "legacy", metric: { label: "Clutch Rating", value: "90" } },
    { name: "Cody Gakpo", era: "Modern", number: 11, status: "active", metric: { label: "Clutch Rating", value: "84" } },
    { name: "Xavi Simons", era: "Modern", number: 7, status: "active", metric: { label: "Clutch Rating", value: "83" } },
    { name: "Frenkie de Jong", era: "Modern", number: 21, status: "active", metric: { label: "Clutch Rating", value: "85" } },
  ],
  Italy: [
    { name: "Roberto Baggio", era: "1990s", number: 10, status: "legacy", metric: { label: "WC Goals", value: "9" } },
    { name: "Paolo Maldini", era: "1990s", number: 3, status: "legacy", metric: { label: "Clutch Rating", value: "92" } },
    { name: "Gianluigi Buffon", era: "2000s", number: 1, status: "legacy", metric: { label: "Trophies", value: "WC 2006" } },
    { name: "Nicolò Barella", era: "Modern", number: 18, status: "active", metric: { label: "Clutch Rating", value: "84" } },
    { name: "Federico Chiesa", era: "Modern", number: 14, status: "active", metric: { label: "Clutch Rating", value: "83" } },
  ],
};

export function getPlayers(team: string): Player[] {
  return PLAYERS[team] ?? [];
}
