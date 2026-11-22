"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Benchmark 2, exact costs. Both meters spend at the same rate; the cheaper run stops first.
const SOLO = 1.5882, HS_F = 0.4583, HS_S = 0.2957, HS = HS_F + HS_S, MAX = 1.6, GROW_MS = 6000;
const fmt = (v: number) => "$" + v.toFixed(2);

export function CostMeters() {
  const [d, setD] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  function play() {
    cancelAnimationFrame(raf.current);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setD(SOLO); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const x = Math.min((now - start) / GROW_MS, 1);
      setD(x * SOLO);
      if (x < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  // Start when scrolled into view, once. The flag is a ref (not state) so starting doesn't
  // re-run this effect, whose cleanup would cancel the animation it just started.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        io.disconnect();
        play();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf.current); };
  }, []);

  const solo = Math.min(d, SOLO), hs = Math.min(d, HS), f = Math.min(hs, HS_F), s = Math.max(hs - HS_F, 0);
  const done = d >= SOLO;

  const lane = (name: string, sub: string, cost: number, finished: boolean, bars: React.ReactNode, note: string) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="text-lg font-semibold sm:text-xl">{name}</div>
        <div className="text-xs text-ink-3">{sub}</div>
      </div>
      <div className="order-3 col-span-2 h-12 overflow-hidden rounded-xl bg-surface-2 sm:order-none sm:col-span-1 sm:h-14">
        <div className="relative h-full">{bars}</div>
      </div>
      <div className="text-right text-2xl font-semibold tabular-nums sm:text-4xl">{fmt(cost)}</div>
      <div className={`order-4 col-span-2 min-h-5 text-xs sm:col-start-2 sm:col-span-2 ${finished ? "text-good" : "text-ink-3"}`}>
        {finished ? note : ""}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="rounded-xl border border-line bg-surface p-5 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="text-[13px] text-ink-2">Cost to build the same task</span>
        <Button type="button" variant="outline" size="sm" onClick={play} className="shrink-0 whitespace-nowrap">Replay ↻</Button>
      </div>
      <div className="flex flex-col gap-6">
        {lane("Frontier alone", "Claude Opus 5.5", solo, d >= SOLO,
          <div className="absolute inset-y-0 left-0 rounded-xl bg-frontier" style={{ width: `${(solo / MAX) * 100}%` }} />,
          "task complete · 20/20 tests passed")}
        {lane("hstack", "Opus directs · Haiku builds", hs, d >= HS,
          <>
            <div className="absolute inset-y-0 left-0 bg-frontier" style={{ width: `${(f / MAX) * 100}%`, borderRadius: s > 0 ? "12px 0 0 12px" : "12px" }} />
            <div className="absolute inset-y-0 bg-small" style={{ left: `${(f / MAX) * 100}%`, width: s > 0 ? `${Math.max((s / MAX) * 100, 0.5)}%` : "0%", borderRadius: "0 12px 12px 0" }} />
          </>,
          "task complete · 20/20 tests passed · Haiku worker: $0.30")}
      </div>
      <div className={`mt-8 grid grid-cols-2 gap-6 transition-all duration-700 sm:pl-[196px] ${done ? "opacity-100" : "translate-y-2 opacity-0"}`}>
        <div>
          <div className="text-5xl font-bold tracking-tighter sm:text-7xl">−53%</div>
          <div className="mt-2 text-xs text-ink-3">cost · $0.75 vs $1.59</div>
        </div>
        <div>
          <div className="text-5xl font-bold tracking-tighter sm:text-7xl">100%</div>
          <div className="mt-2 text-xs text-ink-3">quality · 20/20 hidden tests, both</div>
        </div>
      </div>
    </div>
  );
}
