"use client";

/* =============================================================================
   Visual Intelligence — a three-card bento row of zero-dependency SVG visuals.
   Matches the project's sharp, mono, copper bento language (no glassmorphism —
   that would clash with the established tactical aesthetic). Framer Motion is
   used sparingly for staggered card entrance and the ripple drift, with reduced-
   motion respected throughout.
============================================================================= */
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Prediction } from "@/lib/oracle";

const COPPER = "#b87333";
const clampN = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

export function VisualIntelligence({
  chaos,
  dots,
  knockout,
  prediction,
  teamA,
  teamB,
}: {
  chaos: number; // 0..100
  dots: { diff: number; year: number }[];
  knockout: boolean;
  prediction: Prediction;
  teamA: string;
  teamB: string;
}) {
  const reduce = useReducedMotion();
  // Gate Framer Motion behind mount: the server (and first client render) emit
  // plain markup, so hydration matches exactly; motion attaches afterwards.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const animate = mounted && !reduce;

  return (
    <section className="mx-auto w-full max-w-[1500px] border-t border-line/80 px-6 py-10 sm:px-10">
      <h3 className="mb-6 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink">
        Visual Intelligence
      </h3>
      <div className="grid grid-cols-1 gap-px overflow-hidden border border-line/80 bg-line/60 md:grid-cols-[1.4fr_1fr_1.4fr]">
        <Card index={0} animate={animate} title="Chaos Ripple" sub={`${chaos}% variance`}>
          <ChaosRipple chaos={chaos} reduce={!!reduce} />
        </Card>
        <Card index={1} animate={animate} title="Rivalry Gravity Well" sub={`${dots.length} meetings`}>
          <GravityWell dots={dots} />
        </Card>
        <Card index={2} animate={animate} title="Ghost Bracket" sub={knockout ? "Knockout lineage" : "Group stage"}>
          <GhostBracket knockout={knockout} prediction={prediction} teamA={teamA} teamB={teamB} />
        </Card>
      </div>
    </section>
  );
}

function Card({
  index,
  animate,
  title,
  sub,
  children,
}: {
  index: number;
  animate: boolean;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  const header = (
    <div className="flex items-baseline justify-between">
      <span className="text-[0.58rem] uppercase tracking-[0.22em] text-faint">{title}</span>
      <span className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-copper">{sub}</span>
    </div>
  );
  const cls = "flex flex-col gap-4 bg-canvas px-5 py-5";

  if (!animate) {
    return (
      <div className={cls}>
        {header}
        {children}
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
      className={cls}
    >
      {header}
      {children}
    </motion.div>
  );
}

/* ----- 1 · CHAOS RIPPLE ---------------------------------------------------- */

// Flat sharp line at 0; multi-layered sine whose amplitude scales with chaos.
// Spans 0..400 (two seamless periods) so it can drift -200 on a loop.
function ripplePath(chaos: number): string {
  const mid = 50;
  if (chaos <= 0) return `M 0 ${mid} L 400 ${mid}`;
  const amp = 26 * chaos;
  const step = 5;
  let d = `M 0 ${mid}`;
  for (let x = step; x <= 400; x += step) {
    const y =
      mid +
      Math.sin((x * 2 * Math.PI) / 100) * amp +
      Math.sin((x * 2 * Math.PI) / 200) * amp * 0.4;
    d += ` L ${x} ${y.toFixed(1)}`;
  }
  return d;
}

function ChaosRipple({ chaos, reduce }: { chaos: number; reduce: boolean }) {
  // Drift is rendered only after mount, so SSR and first client render match
  // (no hydration mismatch). SMIL translate uses SVG user units, so a 0..400
  // path drifting -200 loops seamlessly. Honors reduced-motion.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const d = useMemo(() => ripplePath(chaos / 100), [chaos]);
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-24 w-full">
      <g>
        {mounted && !reduce && (
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="translate"
            from="0 0"
            to="-200 0"
            dur="7s"
            repeatCount="indefinite"
          />
        )}
        <path
          d={d}
          fill="none"
          className="stroke-[#b87333]"
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 5px ${COPPER}88)` }}
        />
      </g>
    </svg>
  );
}

/* ----- 2 · RIVALRY GRAVITY WELL -------------------------------------------- */

function GravityWell({ dots }: { dots: { diff: number; year: number }[] }) {
  const rings = [
    { r: 30, label: "0" },
    { r: 60, label: "1–2" },
    { r: 90, label: "3+" },
  ];
  return (
    <svg viewBox="0 0 200 200" className="mx-auto aspect-square w-full max-w-[180px]">
      {rings.map((ring) => (
        <g key={ring.r}>
          <circle cx={100} cy={100} r={ring.r} fill="none" className="stroke-line/70" strokeWidth={0.75} />
          <text
            x={100}
            y={100 - ring.r - 2}
            textAnchor="middle"
            className="fill-faint"
            style={{ fontSize: 6, letterSpacing: 0.5 }}
          >
            {ring.label}
          </text>
        </g>
      ))}
      <circle cx={100} cy={100} r={1.4} fill={COPPER} />

      {dots.map((dot, i) => {
        const angle = i * 137.508 * (Math.PI / 180); // golden-angle scatter, stable
        const r = 12 + Math.min(dot.diff, 4) * 19;
        // Round trig output: Math.cos/sin aren't bit-identical Node↔browser, which
        // would otherwise trip a hydration mismatch on the cx/cy attributes.
        const cx = (100 + r * Math.cos(angle)).toFixed(2);
        const cy = (100 + r * Math.sin(angle)).toFixed(2);
        const recent = dot.year >= 2020;
        const opacity = recent ? 1 : Number(clampN(0.12 + ((dot.year - 1950) / 80) * 0.7, 0.12, 0.85).toFixed(3));
        return (
          <circle key={i} cx={cx} cy={cy} r={recent ? 2.6 : 2} fill={recent ? "#f0dcae" : COPPER} opacity={opacity} />
        );
      })}

      {dots.length === 0 && (
        <text x={100} y={103} textAnchor="middle" className="fill-faint" style={{ fontSize: 7, letterSpacing: 1 }}>
          NO RIVALRY DATA
        </text>
      )}
    </svg>
  );
}

/* ----- 3 · GHOST BRACKET LINEAGE ------------------------------------------- */

function GhostBracket({
  knockout,
  prediction,
  teamA,
  teamB,
}: {
  knockout: boolean;
  prediction: Prediction;
  teamA: string;
  teamB: string;
}) {
  const aFav = prediction.win >= prediction.loss;

  if (!knockout) {
    return (
      <div className="flex h-24 flex-col justify-center gap-2">
        <BracketNode team={teamA} dim />
        <BracketNode team={teamB} dim />
        <p className="pt-1 text-[0.54rem] uppercase tracking-[0.18em] text-faint">
          Lineage activates in knockout rounds
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-24 items-center gap-2">
      <div className="flex flex-1 flex-col gap-3">
        <BracketNode team={teamA} fav={aFav} pct={prediction.win} />
        <BracketNode team={teamB} fav={!aFav} pct={prediction.loss} />
      </div>

      <svg viewBox="0 0 40 70" className="h-20 w-8 shrink-0" preserveAspectRatio="none">
        {/* top (A) → merge */}
        <path
          d="M0 18 H24 V35"
          fill="none"
          stroke={aFav ? COPPER : "currentColor"}
          strokeWidth={aFav ? 1.5 : 1}
          className={aFav ? "" : "text-line"}
          style={aFav ? { filter: `drop-shadow(0 0 3px ${COPPER}99)` } : { opacity: 0.2 }}
        />
        {/* bottom (B) → merge */}
        <path
          d="M0 52 H24 V35"
          fill="none"
          stroke={!aFav ? COPPER : "currentColor"}
          strokeWidth={!aFav ? 1.5 : 1}
          className={!aFav ? "" : "text-line"}
          style={!aFav ? { filter: `drop-shadow(0 0 3px ${COPPER}99)` } : { opacity: 0.2 }}
        />
        {/* merge → pill */}
        <path d="M24 35 H40" fill="none" stroke={COPPER} strokeWidth={1.5} />
      </svg>

      <div
        className="flex shrink-0 items-center border border-copper/70 px-2.5 py-3 text-center"
        style={{ filter: `drop-shadow(0 0 6px ${COPPER}44)` }}
      >
        <span className="text-[0.5rem] font-semibold uppercase leading-tight tracking-[0.16em] text-copper">
          Next
          <br />
          Prospective
          <br />
          Battleground
        </span>
      </div>
    </div>
  );
}

function BracketNode({
  team,
  fav,
  pct,
  dim,
}: {
  team: string;
  fav?: boolean;
  pct?: number;
  dim?: boolean;
}) {
  const code = team.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  return (
    <div
      className={`flex items-center justify-between gap-2 border px-2.5 py-1.5 transition-opacity ${
        dim ? "border-line/60 opacity-40" : fav ? "border-copper/70" : "border-line/60 opacity-20"
      }`}
      style={fav ? { filter: `drop-shadow(0 0 5px ${COPPER}55)` } : undefined}
    >
      <span
        className={`font-display text-sm font-bold uppercase tracking-tight ${fav ? "text-copper" : "text-muted"}`}
      >
        {code}
      </span>
      {pct !== undefined && (
        <span className={`font-mono text-[0.56rem] ${fav ? "text-copper" : "text-faint"}`}>
          {Math.round(pct * 100)}%
        </span>
      )}
    </div>
  );
}
