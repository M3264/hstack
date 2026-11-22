"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostMeters } from "@/components/cost-meters";

// Exact figures from benchmarks/02-waitlist-backend/results.md + results.raw.json.
const TOKENS = { solo: 39806, frontier: 4047, worker: 106081 };
const WALL = { soloMin: 5.5, hstackMin: 7.9 };

const fmtInt = (v: number) => v.toLocaleString("en-US");

function BarRow({
  name,
  sub,
  value,
  segments,
  note,
}: {
  name: string;
  sub: string;
  value: string;
  segments: { width: number; className: string }[];
  note?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="text-lg font-semibold sm:text-xl">{name}</div>
        <div className="text-xs text-ink-3">{sub}</div>
      </div>
      <div className="order-3 col-span-2 h-12 overflow-hidden rounded-xl bg-surface-2 sm:order-none sm:col-span-1 sm:h-14">
        <div className="relative h-full">
          {segments.map((s, i) => (
            <div
              key={i}
              className={`absolute inset-y-0 ${s.className}`}
              style={{ left: `${segments.slice(0, i).reduce((a, x) => a + x.width, 0)}%`, width: `${Math.max(s.width, 0.5)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="text-right text-2xl font-semibold tabular-nums sm:text-4xl">{value}</div>
      <div className="order-4 col-span-2 min-h-5 text-xs text-ink-3 sm:col-start-2 sm:col-span-2">{note ?? ""}</div>
    </div>
  );
}

/** Cost / Tokens / Time tabs over the exact benchmark-2 figures. */
export function BenchmarkCompare() {
  const [tab, setTab] = useState("cost");
  const tokenTotal = TOKENS.frontier + TOKENS.worker;
  const tokenMax = Math.max(TOKENS.solo, tokenTotal);

  return (
    <Tabs value={tab} onValueChange={setTab} aria-label="Benchmark 2 results by measure">
      <div className="overflow-x-auto">
        <TabsList className="mb-4 min-w-[320px]">
          <TabsTrigger value="cost" className="min-h-11 flex-1">Cost</TabsTrigger>
          <TabsTrigger value="tokens" className="min-h-11 flex-1">Tokens</TabsTrigger>
          <TabsTrigger value="time" className="min-h-11 flex-1">Time</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="cost">
        <CostMeters />
      </TabsContent>
      <TabsContent value="tokens">
        <div className="rounded-xl border border-line bg-surface p-5 sm:p-8">
          <div className="mb-6 text-[13px] text-ink-2">Output tokens per run</div>
          <div className="flex flex-col gap-6">
            <BarRow
              name="Frontier alone"
              sub="Claude Opus 5.5"
              value={fmtInt(TOKENS.solo)}
              segments={[{ width: (TOKENS.solo / tokenMax) * 100, className: "bg-frontier rounded-xl" }]}
              note="20/20 hidden tests passed"
            />
            <BarRow
              name="hstack"
              sub="Opus directs · Haiku builds"
              value={fmtInt(tokenTotal)}
              segments={[
                { width: (TOKENS.frontier / tokenMax) * 100, className: "bg-frontier rounded-l-xl" },
                { width: (TOKENS.worker / tokenMax) * 100, className: "bg-small rounded-r-xl" },
              ]}
              note={`Frontier wrote ${fmtInt(TOKENS.frontier)} · worker wrote ${fmtInt(TOKENS.worker)} — 20/20 hidden tests passed`}
            />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-ink-3">
            The frontier wrote 90% fewer output tokens by directing instead of building. The worker&apos;s tokens cost less per token, which is where the −53% comes from.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="time">
        <div className="rounded-xl border border-line bg-surface p-5 sm:p-8">
          <div className="mb-6 text-[13px] text-ink-2">Wall-clock time per run</div>
          <div className="flex flex-col gap-6">
            <BarRow
              name="Frontier alone"
              sub="One session"
              value={`${WALL.soloMin} min`}
              segments={[{ width: (WALL.soloMin / WALL.hstackMin) * 100, className: "bg-frontier rounded-xl" }]}
              note="20/20 hidden tests passed"
            />
            <BarRow
              name="hstack"
              sub="Brief, plan, build, review"
              value={`${WALL.hstackMin} min`}
              segments={[{ width: 100, className: "bg-small rounded-xl" }]}
              note="20/20 hidden tests passed · one run per side"
            />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-ink-3">
            hstack took 1.4× longer on the clock. The saving is cost, not speed: cheaper tokens doing most of the writing.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
