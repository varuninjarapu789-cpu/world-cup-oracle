"use client";

/* =============================================================================
   Searchable team picker. The massive editorial team name is itself the
   trigger; clicking it opens a filterable listbox. Zero dependencies, sharp
   corners, copper accents — on-brand with the tactical canvas.
============================================================================= */
import { useEffect, useMemo, useRef, useState } from "react";

export function TeamSelect({
  value,
  options,
  onChange,
  index,
  accent,
}: {
  value: string;
  options: string[];
  onChange: (team: string) => void;
  index: string;
  accent: "copper" | "plum";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentText = accent === "copper" ? "text-copper" : "text-plum";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((t) => t.toLowerCase().includes(q)) : options;
    return list.slice(0, 60);
  }, [options, query]);

  // close on outside click / escape
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

  const commit = (team: string) => {
    onChange(team);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) commit(filtered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-baseline gap-3">
        <span className={`font-mono text-[0.7rem] tracking-[0.2em] ${accentText}`}>{index}</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="group flex items-baseline gap-3 text-left"
        >
          <h2 className="font-display text-[clamp(2.5rem,9vw,5.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-ink text-balance transition-colors group-hover:text-copper">
            {value}
          </h2>
          <span
            aria-hidden
            className={`text-2xl ${accentText} transition-transform ${open ? "rotate-180" : ""} group-hover:translate-y-0.5`}
          >
            ▾
          </span>
        </button>
      </div>

      {open && (
        <div className="absolute left-9 top-full z-30 mt-3 w-[min(24rem,80vw)] border border-line bg-canvas shadow-2xl shadow-black/60">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="SEARCH TEAMS…"
            aria-label="Search teams"
            className="w-full border-b border-line bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-[0.14em] text-ink placeholder:text-faint focus:outline-none"
          />
          <ul role="listbox" className="max-h-72 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-faint">
                No match
              </li>
            ) : (
              filtered.map((team, i) => {
                const selected = team === value;
                const isActive = i === active;
                return (
                  <li key={team} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => commit(team)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left font-mono text-sm uppercase tracking-[0.1em] transition-colors ${
                        isActive ? "bg-surface text-ink" : "text-muted"
                      }`}
                    >
                      <span className={selected ? accentText : ""}>{team}</span>
                      {selected && <span aria-hidden className={`text-xs ${accentText}`}>●</span>}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
