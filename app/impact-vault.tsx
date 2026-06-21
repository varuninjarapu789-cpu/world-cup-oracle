"use client";

/* =============================================================================
   Generational Impact Vault — wireframe jersey icons of each side's legends and
   active 2026 stars. Clicking a jersey expands a hairline info drawer (Framer
   Motion). The jerseys are plain SVG and the drawer only mounts on interaction,
   so the server output carries no motion — hydration stays clean.
============================================================================= */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getPlayers, type Player } from "@/config/players";
import { JERSEY_PATH } from "./team-kits";

const COPPER = "#b87333";

type Selection = { player: Player; side: "a" | "b" } | null;

export function ImpactVault({ teamA, teamB }: { teamA: string; teamB: string }) {
  const [selected, setSelected] = useState<Selection>(null);
  const reduce = useReducedMotion();

  // Clear a stale selection if it no longer belongs to the current matchup.
  const current =
    selected &&
    ((selected.side === "a" && getPlayers(teamA).includes(selected.player)) ||
      (selected.side === "b" && getPlayers(teamB).includes(selected.player)))
      ? selected
      : null;

  const toggle = (player: Player, side: "a" | "b") =>
    setSelected((prev) => (prev?.player === player ? null : { player, side }));

  return (
    <section className="mx-auto w-full max-w-[1500px] border-t border-line/80 px-6 py-10 sm:px-10">
      <h3 className="mb-6 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink">
        Generational Impact Vault
      </h3>

      <div className="grid grid-cols-1 gap-px border border-line/80 bg-line/60 md:grid-cols-2">
        <TeamColumn team={teamA} side="a" selected={current} onToggle={toggle} />
        <TeamColumn team={teamB} side="b" selected={current} onToggle={toggle} />
      </div>

      <AnimatePresence initial={false}>
        {current && (
          <motion.div
            key={`${current.side}-${current.player.name}`}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <PlayerDrawer player={current.player} side={current.side} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TeamColumn({
  team,
  side,
  selected,
  onToggle,
}: {
  team: string;
  side: "a" | "b";
  selected: Selection;
  onToggle: (player: Player, side: "a" | "b") => void;
}) {
  const players = getPlayers(team);
  const active = players.filter((p) => p.status === "active");
  const legacy = players.filter((p) => p.status === "legacy");
  const accent = side === "a" ? "text-copper" : "text-plum";

  return (
    <div className="bg-canvas px-5 py-5">
      <div className="mb-5 flex items-baseline justify-between">
        <span className="font-display text-base font-bold uppercase tracking-tight text-ink">{team}</span>
        <span className={`font-mono text-[0.54rem] uppercase tracking-[0.16em] ${accent}`}>
          {players.length} icons
        </span>
      </div>

      {players.length === 0 ? (
        <p className="text-[0.56rem] uppercase tracking-[0.18em] text-faint">No icons catalogued</p>
      ) : (
        <div className="flex flex-col gap-5">
          <IconGroup label="Active · 2026" players={active} side={side} selected={selected} onToggle={onToggle} />
          <IconGroup label="Legacy" players={legacy} side={side} selected={selected} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}

function IconGroup({
  label,
  players,
  side,
  selected,
  onToggle,
}: {
  label: string;
  players: Player[];
  side: "a" | "b";
  selected: Selection;
  onToggle: (player: Player, side: "a" | "b") => void;
}) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[0.52rem] uppercase tracking-[0.2em] text-faint">{label}</span>
      <div className="flex flex-wrap gap-4">
        {players.map((p) => (
          <VaultJersey
            key={p.name}
            player={p}
            isSelected={selected?.player === p}
            onClick={() => onToggle(p, side)}
          />
        ))}
      </div>
    </div>
  );
}

function VaultJersey({
  player,
  isSelected,
  onClick,
}: {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
}) {
  const active = player.status === "active";
  const stroke = active ? COPPER : "#6b6b6b";
  // Retired legends ghost out (low-opacity charcoal); active stars stay crisp copper.
  const opacity = active ? "opacity-100" : isSelected ? "opacity-90" : "opacity-30 hover:opacity-70";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      title={`${player.name} · #${player.number}`}
      className={`group flex w-14 flex-col items-center gap-1.5 transition-opacity duration-200 ${opacity}`}
    >
      <svg
        viewBox="0 0 32 32"
        className={`w-11 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 ${
          isSelected ? "-translate-y-0.5 scale-105" : ""
        }`}
      >
        <path
          d={JERSEY_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth={active ? 1.5 : 1}
          strokeLinejoin="round"
          style={active || isSelected ? { filter: `drop-shadow(0 0 4px ${COPPER}66)` } : undefined}
        />
        <text
          x="16"
          y="19.5"
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill={stroke}
        >
          {player.number}
        </text>
      </svg>
      <span
        className={`w-full truncate text-center text-[0.5rem] uppercase tracking-[0.08em] ${
          active ? "text-muted" : "text-faint"
        } ${isSelected ? "text-copper" : ""}`}
      >
        {player.name}
      </span>
    </button>
  );
}

function PlayerDrawer({ player, side }: { player: Player; side: "a" | "b" }) {
  const accent = side === "a" ? "bg-copper" : "bg-plum";
  return (
    <div className="mt-px flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border border-t-0 border-line/80 bg-surface/30 px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span aria-hidden className={`mr-1 inline-block size-2 self-center ${accent}`} />
        <span className="font-display text-lg font-bold uppercase tracking-tight text-ink">{player.name}</span>
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-faint">
          #{player.number} · {player.era} · {player.status === "active" ? "Active" : "Legacy"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[0.56rem] uppercase tracking-[0.18em] text-faint">{player.metric.label}</span>
        <span className="font-display text-xl font-bold tabular-nums tracking-tight text-copper">
          {player.metric.value}
        </span>
      </div>
    </div>
  );
}
