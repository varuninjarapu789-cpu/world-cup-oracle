"use client";

/* =============================================================================
   Simulation control matrix (presentational). Renders the live probability bar
   and the three parameter sliders. All state lives in the orchestrator; this
   component just reflects it and reports changes.
============================================================================= */
import type { Prediction } from "@/lib/oracle";

export type Sliders = { historical: number; form: number; chaos: number }; // 0..100

const PARAMETERS = [
  { key: "historical", label: "Historical Weight", caption: "Head-to-head vs. recent form" },
  { key: "form", label: "Recent Form", caption: "Momentum from last 5 games" },
  { key: "chaos", label: "Chaos Factor", caption: "Variance · upsets · flatten" },
] as const;

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ControlMatrix({
  prediction,
  codes,
  sliders,
  onSlider,
  onReset,
  onSetDefault,
  isBaseline,
  pending,
  knockout,
}: {
  prediction: Prediction;
  codes: { a: string; b: string };
  sliders: Sliders;
  onSlider: (key: keyof Sliders, value: number) => void;
  onReset: () => void;
  onSetDefault: () => void;
  isBaseline: boolean;
  pending: boolean;
  knockout: boolean;
}) {
  return (
    <div className="relative flex flex-col gap-10 bg-surface/30 px-6 py-12 sm:px-10 lg:py-16">
      <CornerTicks />

      <div className="flex items-center justify-between">
        <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink">
          Simulation Control Matrix
        </h3>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint">MTX · 03</span>
      </div>

      <ProbabilityBar prediction={prediction} codes={codes} pending={pending} knockout={knockout} />

      <div className="flex flex-col gap-7 border-t border-line pt-8">
        <div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.22em] text-faint">
          <span>Model Parameters</span>
          <span>Weighting</span>
        </div>
        {PARAMETERS.map((p) => (
          <ControlSlider
            key={p.key}
            label={p.label}
            caption={p.caption}
            value={sliders[p.key]}
            onChange={(v) => onSlider(p.key, v)}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <MatrixButton onClick={onSetDefault} disabled={isBaseline} glyph="⌖">
          {isBaseline ? "Is Default" : "Set as Default"}
        </MatrixButton>
        <MatrixButton onClick={onReset} disabled={isBaseline} glyph="↺">
          {isBaseline ? "Baseline" : "Reset"}
        </MatrixButton>
      </div>
    </div>
  );
}

function CornerTicks() {
  const base = "absolute size-3 border-copper/60";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3">
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}

function ProbabilityBar({
  prediction,
  codes,
  pending,
  knockout,
}: {
  prediction: Prediction;
  codes: { a: string; b: string };
  pending: boolean;
  knockout: boolean;
}) {
  // Knockout ties are resolved (predict() zeroes the draw), so the bar collapses
  // to a definitive two-way "to advance"; group stage keeps the Win/Draw/Win split.
  const segments = knockout
    ? [
        { label: codes.a, sub: "Adv", value: prediction.win, bar: "bg-copper", text: "text-copper" },
        { label: codes.b, sub: "Adv", value: prediction.loss, bar: "bg-plum", text: "text-plum" },
      ]
    : [
        { label: codes.a, sub: "Win", value: prediction.win, bar: "bg-copper", text: "text-copper" },
        { label: "Draw", sub: "Tie", value: prediction.draw, bar: "bg-faint", text: "text-muted" },
        { label: codes.b, sub: "Win", value: prediction.loss, bar: "bg-plum", text: "text-plum" },
      ];

  return (
    <div className={`flex flex-col gap-4 transition-opacity duration-200 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between text-[0.62rem] uppercase tracking-[0.22em] text-faint">
        <span>{knockout ? "Advancement Probability" : "Win Probability"}</span>
        <span>{knockout ? "Definitive winner" : "Projected outcome"}</span>
      </div>

      <div
        className="flex h-12 w-full overflow-hidden border border-line"
        role="img"
        aria-label={
          knockout
            ? `${codes.a} advance ${pct(prediction.win)}, ${codes.b} advance ${pct(prediction.loss)}`
            : `${codes.a} win ${pct(prediction.win)}, Draw ${pct(prediction.draw)}, ${codes.b} win ${pct(prediction.loss)}`
        }
      >
        {segments.map((s, i) => (
          <div
            key={s.label}
            className={`relative ${s.bar} ${i > 0 ? "border-l border-canvas" : ""} transition-[width] duration-500 ease-out motion-reduce:transition-none`}
            style={{ width: pct(s.value) }}
          >
            <span className="absolute left-2 top-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-canvas">
              {pct(s.value)}
            </span>
          </div>
        ))}
      </div>

      <div className={`grid ${knockout ? "grid-cols-2" : "grid-cols-3"} border-x border-b border-line`}>
        {segments.map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5 border-l border-line px-3 py-3 first:border-l-0">
            <div className="flex items-center gap-2">
              <span aria-hidden className={`block size-2 ${s.bar}`} />
              <span className="truncate text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                {s.label} <span className="text-faint">/ {s.sub}</span>
              </span>
            </div>
            <span className={`font-display text-2xl font-bold tabular-nums tracking-tight ${s.text}`}>
              {pct(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  caption,
  value,
  onChange,
}: {
  label: string;
  caption: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-ink">{label}</label>
        <span className="font-display text-lg font-bold tabular-nums tracking-tight text-copper">
          {value}
          <span className="ml-0.5 font-mono text-[0.6rem] font-normal text-faint">%</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="fader"
      />
      <div className="flex items-center justify-between text-[0.58rem] uppercase tracking-[0.18em] text-faint">
        <span>{caption}</span>
        <span aria-hidden className="font-mono">
          0 — 100
        </span>
      </div>
    </div>
  );
}

function MatrixButton({
  onClick,
  disabled,
  glyph,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  glyph: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center justify-between border border-copper/70 px-4 py-4 text-left transition-colors duration-200 enabled:hover:bg-copper enabled:focus-visible:bg-copper disabled:cursor-not-allowed disabled:border-line disabled:opacity-50 focus-visible:outline-none"
    >
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-copper transition-colors group-enabled:group-hover:text-canvas group-enabled:group-focus-visible:text-canvas group-disabled:text-faint">
        {children}
      </span>
      <span
        aria-hidden
        className="font-mono text-sm text-copper transition-colors group-enabled:group-hover:text-canvas group-disabled:text-faint"
      >
        {glyph}
      </span>
    </button>
  );
}
