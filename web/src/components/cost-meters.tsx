"use client";

import { useEffect, useRef, useState } from "react";

// Benchmark 1, exact costs. Both meters spend at the same rate; the cheaper run stops first.
const SOLO = 2.4619, HS_F = 1.489, HS_S = 0.0994, HS = HS_F + HS_S, MAX = 2.5, GROW_MS = 6000;
const fmt = (v: number) => "$" + v.toFixed(2);

export function CostMeters() {
  const [d, setD] = useState(0);
  const [started, setStarted] = useState(false);
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

  // Start when scrolled into view, once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { setStarted(true); play(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf.current); };
  }, [started]);

  const solo = Math.min(d, SOLO), hs = Math.min(d, HS), f = Math.min(hs, HS_F), s = Math.max(hs - HS_F, 0);
  const done = d >= SOLO;

  const lane = (name: string, sub: string, cost: number, finished: boolean, bars: React.ReactNode, note: string) => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="text-lg font-semibold sm:text-xl">{name}</div>
        <div className="font-mono text-xs text-ink-3">{sub}</div>
      </div>
      <div className="order-3 col-span-2 h-12 overflow-hidden rounded-xl bg-surface-2 sm:order-none sm:col-span-1 sm:h-14">
        <div className="relative h-full">{bars}</div>
      </div>
      <div className="text-right font-mono text-2xl font-semibold tabular-nums sm:text-4xl">{fmt(cost)}</div>
      <div className={`order-4 col-span-2 min-h-5 font-mono text-xs sm:col-start-2 sm:col-span-2 ${finished ? "text-good" : "text-ink-3"}`}>
        {finished ? note : ""}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="rounded-[22px] border border-line bg-surface p-5 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-3">Cost to build the same task</span>
        <button type="button" onClick={play} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-ink-2 hover:text-ink">Replay ↻</button>
      </div>
      <div className="flex flex-col gap-6">
        {lane("Frontier alone", "Muse Wonder 1.0", solo, d >= SOLO,
          <div className="absolute inset-y-0 left-0 rounded-xl bg-frontier" style={{ width: `${(solo / MAX) * 100}%` }} />,
          "task complete · 82/82 tests passed")}
        {lane("hstack", "Wonder directs · Spark builds", hs, d >= HS,
          <>
            <div className="absolute inset-y-0 left-0 bg-frontier" style={{ width: `${(f / MAX) * 100}%`, borderRadius: s > 0 ? "12px 0 0 12px" : "12px" }} />
            <div className="absolute inset-y-0 bg-small" style={{ left: `${(f / MAX) * 100}%`, width: s > 0 ? `${Math.max((s / MAX) * 100, 0.5)}%` : "0%", borderRadius: "0 12px 12px 0" }} />
          </>,
          "task complete · 82/82 tests passed · small model: $0.10")}
      </div>
      <div className={`mt-8 grid grid-cols-2 gap-6 transition-all duration-700 sm:pl-[196px] ${done ? "opacity-100" : "translate-y-2 opacity-0"}`}>
        <div>
          <div className="text-5xl font-bold tracking-tighter sm:text-7xl">−35%</div>
          <div className="mt-2 font-mono text-xs text-ink-3">cost · $1.59 vs $2.46</div>
        </div>
        <div>
          <div className="text-5xl font-bold tracking-tighter sm:text-7xl">100%</div>
          <div className="mt-2 font-mono text-xs text-ink-3">quality · 82/82 hidden tests, both</div>
        </div>
      </div>
    </div>
  );
}
