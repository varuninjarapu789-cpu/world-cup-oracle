"use client";

/* =============================================================================
   Compact inline dropdown for the tournament stage. Sits in the fixture meta
   row, reads like the surrounding text, opens a sharp copper-accented menu.
============================================================================= */
import { useEffect, useRef, useState } from "react";

export function StageSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ink transition-colors hover:text-copper"
      >
        {value}
        <span
          aria-hidden
          className={`text-[0.8em] text-copper transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-52 border border-line bg-canvas py-1 shadow-2xl shadow-black/60"
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-[0.62rem] uppercase tracking-[0.12em] transition-colors hover:bg-surface ${
                    selected ? "text-copper" : "text-muted"
                  }`}
                >
                  {opt}
                  {selected && <span aria-hidden className="text-copper">●</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
