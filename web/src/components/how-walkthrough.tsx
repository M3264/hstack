"use client";

import Image from "next/image";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductWindow } from "@/components/product-window";

// Thread indices in product-window.tsx: 0 brief, 1 plan, 2 approve, 3 working,
// 4 done (199 tests), 5 correction, 6 fixed, 7 approve.
const steps = [
  {
    id: "brief",
    name: "Brief",
    highlight: [0],
    caption: "The frontier writes the brief: about 15 lines — why, acceptance criteria, constraints, the risks it will check, and the done commands. No code.",
  },
  {
    id: "plan",
    name: "Plan",
    highlight: [1, 2],
    caption: "The worker explores the repo, writes PLAN.md, and reports. The frontier approves it.",
    flow: true,
  },
  {
    id: "build",
    name: "Build",
    highlight: [3, 4],
    caption: "Haiku writes tests first, then the implementation: 199 tests passing, tsc clean.",
  },
  {
    id: "review",
    name: "Review",
    highlight: [5, 6, 7],
    caption: "The frontier runs the checks itself, catches one real bug — a replaced unsubscribe token — and approves the regression-tested fix.",
  },
];

/** One walkthrough: four tabs drive a single preview of the real run. */
export function HowWalkthrough() {
  const [step, setStep] = useState("brief");
  const index = steps.findIndex((s) => s.id === step);
  const current = steps[index] ?? steps[0];

  return (
    <Tabs value={step} onValueChange={setStep} aria-label="How hstack works, in four steps">
      <span className="sr-only" role="status">
        Step {index + 1} of 4: {current.name}
      </span>
      <div className="overflow-x-auto">
        <TabsList className="grid w-full min-w-[480px] grid-cols-4">
          {steps.map((s, i) => (
            <TabsTrigger key={s.id} value={s.id} className="min-h-11">
              <span className="mr-2 text-ink-3">{i + 1}</span>
              {s.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {steps.map((s) => (
        <TabsContent key={s.id} value={s.id} className="mt-4">
          <p className="mb-4 max-w-3xl text-[15px] leading-relaxed text-ink-2">{s.caption}</p>
          <ProductWindow highlight={s.highlight} />
          {s.flow && (
            <figure className="tile mt-4 bg-[#121212]">
              <Image
                src="/hstack-flow.png"
                alt="hstack workflow: the frontier writes the brief, the worker plans and builds, optionally with parallel workers and an independent reviewer, and the frontier approves at the plan and done checkpoints."
                width={1498}
                height={1152}
                className="mx-auto h-auto w-full max-w-4xl"
              />
              <figcaption className="border-t border-line px-5 py-3 text-[13px] text-ink-3">
                The loop the preview above just ran: brief, plan, build, review.
              </figcaption>
            </figure>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
