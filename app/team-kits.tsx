/* =============================================================================
   Team identity — kit colors, flag stripes, and a wireframe jersey silhouette.
   Pure presentational + static config (no event data needed). Shared by the
   client matchup canvas.
============================================================================= */

export type Kit = { primary: string; secondary: string; flag: string[] };

// Curated kit + flag palette for common sides; everything else gets FALLBACK.
const KITS: Record<string, Kit> = {
  Brazil: { primary: "#f7d417", secondary: "#1d4ed8", flag: ["#009c3b", "#ffdf00", "#002776"] },
  Morocco: { primary: "#c1272d", secondary: "#0f6e3d", flag: ["#c1272d", "#006233"] },
  Argentina: { primary: "#6cace4", secondary: "#1f2a44", flag: ["#75aadb", "#ffffff", "#75aadb"] },
  France: { primary: "#1e3a8a", secondary: "#e5e7eb", flag: ["#0055a4", "#ffffff", "#ef4135"] },
  Germany: { primary: "#e8e8e8", secondary: "#111827", flag: ["#000000", "#dd0000", "#ffce00"] },
  Spain: { primary: "#c60b1e", secondary: "#1f2a44", flag: ["#aa151b", "#f1bf00", "#aa151b"] },
  England: { primary: "#f2f2f2", secondary: "#c8102e", flag: ["#ffffff", "#ce1124", "#ffffff"] },
  Italy: { primary: "#1b5cc4", secondary: "#e5e7eb", flag: ["#009246", "#ffffff", "#ce2b37"] },
  Portugal: { primary: "#c1272d", secondary: "#0f5132", flag: ["#006600", "#ff0000"] },
  Netherlands: { primary: "#f36c21", secondary: "#1f2a44", flag: ["#ae1c28", "#ffffff", "#21468b"] },
  Belgium: { primary: "#c8102e", secondary: "#1f2a44", flag: ["#000000", "#fdda24", "#ef3340"] },
  Croatia: { primary: "#d12d2d", secondary: "#1f3a8a", flag: ["#ff0000", "#ffffff", "#171796"] },
  Uruguay: { primary: "#5ca9e6", secondary: "#1f2a44", flag: ["#7cb9e8", "#ffffff"] },
  Mexico: { primary: "#16703a", secondary: "#e5e7eb", flag: ["#006847", "#ffffff", "#ce1126"] },
  "United States": { primary: "#1f2a55", secondary: "#e5e7eb", flag: ["#3c3b6e", "#ffffff", "#b22234"] },
  Japan: { primary: "#1b3a8c", secondary: "#e5e7eb", flag: ["#ffffff", "#bc002d", "#ffffff"] },
  "Korea Republic": { primary: "#cf2330", secondary: "#1f2a44", flag: ["#ffffff", "#cd2e3a", "#0047a0"] },
  Senegal: { primary: "#0f9b4a", secondary: "#e5e7eb", flag: ["#00853f", "#fdef42", "#e31b23"] },
  Ghana: { primary: "#e5e7eb", secondary: "#d12d2d", flag: ["#ce1126", "#fcd116", "#006b3f"] },
  Nigeria: { primary: "#0f9b4a", secondary: "#e5e7eb", flag: ["#008751", "#ffffff", "#008751"] },
};

const FALLBACK: Kit = { primary: "#8a8a8a", secondary: "#b87333", flag: ["#5a5a5a", "#8a8a8a"] };

export function getKit(team: string): Kit {
  return KITS[team] ?? FALLBACK;
}

// Shared jersey silhouette outline (used filled here, stroked in the vault).
export const JERSEY_PATH = "M11 5 C14 8 18 8 21 5 L26 7 L30 12 L25 14.5 L25 28 L7 28 L7 14.5 L2 12 L6 7 Z";

// Minimalist wireframe jersey silhouette filled with the active kit color.
export function TeamJersey({ fill, className = "" }: { fill: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden role="img">
      <path
        d={JERSEY_PATH}
        fill={fill}
        fillOpacity={0.9}
        stroke="rgba(237,234,227,0.45)"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 2px flag-colored stripe along the bottom lip of a team's card.
export function FlagStripe({ colors }: { colors: string[] }) {
  return (
    <div className="mt-3 flex h-0.5 w-full max-w-md overflow-hidden">
      {colors.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

// Faint radial color glow cast behind a team's card.
export function KitGlow({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ background: `radial-gradient(60% 75% at 18% 45%, ${color}1f, transparent 70%)` }}
    />
  );
}
