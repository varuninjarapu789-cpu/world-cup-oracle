"use client";

/* =============================================================================
   Searchable venue picker with a two-tier layout. Cities where the two selected
   teams have actually met ("Historic Battlegrounds", most-played first) float to
   the top; the rest of the global dataset follows alphabetically. When the pair
   has no shared history the battlegrounds section is hidden and the list is flat.
   Inline trigger, upward-opening, zero dependencies, keyboard-accessible.
============================================================================= */
import { useEffect, useMemo, useRef, useState } from "react";

const GLOBAL_LIMIT = 50; // cap the global section for render performance

export function VenueSelect({
  value,
  options,
  battlegrounds,
  onChange,
}: {
  value: string;
  options: string[];
  battlegrounds: string[];
  onChange: (venue: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global = everything that isn't already a battleground (case-insensitive).
  const globalOnly = useMemo(() => {
    const bgKeys = new Set(battlegrounds.map((v) => v.toLowerCase()));
    return options.filter((v) => !bgKeys.has(v.toLowerCase()));
  }, [options, battlegrounds]);

  // Filter both tiers by the query; `flat` drives keyboard navigation.
  const { bg, global, flat } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (v: string) => !q || v.toLowerCase().includes(q);
    const bg = battlegrounds.filter(match);
    const global = globalOnly.filter(match).slice(0, GLOBAL_LIMIT);
    return { bg, global, flat: [...bg, ...global] };
  }, [battlegrounds, globalOnly, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const commit = (venue: string) => {
    onChange(venue);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[active]) commit(flat[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showBattlegrounds = bg.length > 0;

  const option = (opt: string, index: number) => {
    const selected = opt === value;
    const isActive = index === active;
    return (
      <li key={opt} role="option" aria-selected={selected}>
        <button
          type="button"
          onClick={() => commit(opt)}
          onMouseEnter={() => setActive(index)}
          className={`flex w-full min-w-0 items-center justify-between gap-3 px-4 py-2 text-left font-mono text-[0.74rem] uppercase tracking-[0.08em] transition-colors ${
            isActive ? "bg-surface text-ink" : "text-muted"
          }`}
        >
          <span className={`truncate ${selected ? "text-copper" : ""}`}>{opt}</span>
          {selected && <span aria-hidden className="shrink-0 text-xs text-copper">●</span>}
        </button>
      </li>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted transition-colors hover:text-ink"
      >
        <span className="border-b border-dashed border-transparent group-hover:border-line">{value}</span>
        <span
          aria-hidden
          className={`text-[0.8em] text-copper transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(22rem,80vw)] border border-line bg-canvas shadow-2xl shadow-black/60">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="SEARCH VENUES…"
            aria-label="Search venues"
            className="w-full border-b border-line bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-[0.14em] text-ink placeholder:text-faint focus:outline-none"
          />
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {flat.length === 0 && (
              <li className="px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-faint">
                No match
              </li>
            )}

            {showBattlegrounds && (
              <>
                <SectionLabel>🔥 Historic Battlegrounds</SectionLabel>
                {bg.map((opt, i) => option(opt, i))}
                <SectionLabel bordered>🌍 Global Venues</SectionLabel>
              </>
            )}

            {global.map((opt, gi) => option(opt, bg.length + gi))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, bordered }: { children: React.ReactNode; bordered?: boolean }) {
  return (
    <li
      aria-hidden
      className={`px-4 pb-1.5 pt-2.5 font-mono text-[0.54rem] uppercase tracking-[0.2em] text-faint ${
        bordered ? "mt-1 border-t border-line/60 pt-3" : ""
      }`}
    >
      {children}
    </li>
  );
}
