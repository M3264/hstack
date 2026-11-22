"use client";

import { useEffect, useRef } from "react";
import { Face } from "./face";

// Six marks around the headline. Each one is a fact from benchmark 2.
const marks: { cls: string; body: React.ReactNode }[] = [
  { cls: "hf-1", body: <span className="text-[13px] font-semibold tabular-nums text-good">20/20</span> },
  { cls: "hf-2", body: <span className="text-[13px] font-semibold tabular-nums">−53%</span> },
  { cls: "hf-3", body: <Face size={44} color="var(--frontier)" /> },
  { cls: "hf-4", body: <Face size={44} color="var(--small)" /> },
  { cls: "hf-5", body: <span className="text-[11px] text-ink-2">Approve</span> },
  { cls: "hf-6", body: <span className="text-[13px] font-semibold tabular-nums">$0.75</span> },
];

/** Floating marks that lean toward the pointer while the hero is on screen. */
export function HeroFloat() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = ref.current;
    const hero = field?.parentElement;
    if (!field || !hero) return;
    const fine = matchMedia("(pointer: fine)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const reset = () => {
      cancelAnimationFrame(frame);
      field.style.setProperty("--px", "0px");
      field.style.setProperty("--py", "0px");
    };
    const onMove = (e: PointerEvent) => {
      if (!fine.matches || reduced.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const b = hero.getBoundingClientRect();
        if (!b.width || !b.height) return;
        field.style.setProperty("--px", `${(((e.clientX - b.left) / b.width - 0.5) * 36).toFixed(1)}px`);
        field.style.setProperty("--py", `${(((e.clientY - b.top) / b.height - 0.5) * 28).toFixed(1)}px`);
      });
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", reset);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", reset);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="hero-float" aria-hidden>
      {marks.map((m) => (
        <span key={m.cls} className={`hero-float-mark ${m.cls}`}>
          <span className="hero-float-card">{m.body}</span>
        </span>
      ))}
    </div>
  );
}
