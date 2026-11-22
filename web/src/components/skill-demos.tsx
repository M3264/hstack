"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function SkillShell({ name, audience, body, children }: { name: string; audience: string; body: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-[15px]">{name}</CardTitle>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] text-ink-2">{audience}</span>
        </div>
        <CardDescription className="mt-2 text-ink-2">{body}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Sample validation for the demo: non-empty, and not a frontier-class model. */
function validateWorkerName(name: string): { ok: boolean; message: string } {
  const v = name.trim();
  if (!v) return { ok: false, message: "Name a worker model to continue." };
  if (/opus/i.test(v)) return { ok: false, message: "Opus is a frontier model — name a smaller worker." };
  return { ok: true, message: `Valid worker model — hstack active with ${v}.` };
}

function ActivateDemo() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="activate-model">Worker model</Label>
        <div className="flex gap-2">
          <Input
            id="activate-model"
            value={name}
            onChange={(e) => { setName(e.target.value); setResult(null); }}
            placeholder="e.g. haiku 5.5"
            autoComplete="off"
            aria-describedby="activate-result"
            className="min-h-11"
          />
          <Button type="button" onClick={() => setResult(validateWorkerName(name))} className="min-h-11 shrink-0">
            Validate
          </Button>
        </div>
      </div>
      <p id="activate-result" aria-live="polite" className={`mt-3 min-h-5 text-[13px] ${result ? (result.ok ? "text-good" : "text-destructive") : "text-ink-3"}`}>
        {result ? result.message : "Try it empty, try “opus”, try “haiku 5.5”. Sample validation."}
      </p>
    </div>
  );
}

const checklist = ["Why this task exists", "Acceptance criteria", "Constraints", "Risks to check", "Done commands"];

function BriefChecklistDemo() {
  const [checked, setChecked] = useState<boolean[]>(checklist.map(() => false));
  const ready = checked.every(Boolean);
  return (
    <div>
      <div className="flex flex-col gap-3">
        {checklist.map((item, i) => (
          <div key={item} className="flex items-center gap-3">
            <Checkbox
              id={`brief-${i}`}
              checked={checked[i]}
              onCheckedChange={(v) => setChecked((c) => c.map((x, j) => (j === i ? v === true : x)))}
            />
            <Label htmlFor={`brief-${i}`} className="text-sm font-normal text-ink-2">{item}</Label>
          </div>
        ))}
      </div>
      <Button type="button" disabled={!ready} className="mt-4 min-h-11 w-full">
        Approve brief
      </Button>
      <p aria-live="polite" className={`mt-3 min-h-5 text-[13px] ${ready ? "text-good" : "text-ink-3"}`}>
        {ready ? "Brief ready — ASK: approve." : "Check all 5 to enable approval."}
      </p>
    </div>
  );
}

const lanes = [
  { name: "Worker A · auth + store", target: 72, note: "done" },
  { name: "Worker B · API routes", target: 58, note: "done" },
  { name: "Worker C · tests", target: 91, note: "1 retry" },
];

function SwarmDemo() {
  const [values, setValues] = useState<number[]>(lanes.map(() => 0));
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setValues(lanes.map((l) => l.target));
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const x = Math.min((now - start) / 1200, 1);
        setValues(lanes.map((l) => Math.round(l.target * x)));
        if (x < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [run]);

  return (
    <div ref={ref}>
      <div className="flex flex-col gap-4">
        {lanes.map((lane, i) => (
          <div key={lane.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[13px] text-ink-2">{lane.name}</span>
              <span className="text-[13px] tabular-nums text-ink-2">{values[i]}%</span>
            </div>
            <Progress value={values[i]} max={100} aria-label={`${lane.name}: ${values[i]} percent`} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">Sample split — illustration only, not measured figures.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setValues(lanes.map(() => 0)); setRun((r) => r + 1); }}>
          Replay
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-[13px] text-ink-3">
        {values.every((v, i) => v >= lanes[i].target) ? "All three lanes finished — reviewer takes over." : "Running three lanes in parallel…"}
      </p>
    </div>
  );
}

function PracticeDemo() {
  const [view, setView] = useState<string[]>(["after"]);
  const after = view[0] === "after";
  return (
    <div>
      <ToggleGroup value={view} onValueChange={(v) => { if (v[0]) setView([v[0]]); }} aria-label="Before or after the spec example">
        <ToggleGroupItem value="before" className="min-h-11 flex-1">Before</ToggleGroupItem>
        <ToggleGroupItem value="after" className="min-h-11 flex-1">After</ToggleGroupItem>
      </ToggleGroup>
      <div className="mt-3 min-h-[76px] rounded-lg border border-line bg-bg p-4 text-sm leading-relaxed">
        {after ? (
          <p><code className="font-mono text-[13px]">/posts/abc</code> on <code className="font-mono text-[13px]">https://site.dev</code> copies <code className="font-mono text-[13px]">https://site.dev/posts/abc</code>.</p>
        ) : (
          <p className="text-ink-2">Copies the post link.</p>
        )}
      </div>
      <p className="mt-3 text-[13px] text-ink-3">{after ? "Exact input, exact output, where it runs." : "No input, no output, no place. The worker guesses."}</p>
    </div>
  );
}

export function SkillDemos() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SkillShell name="hstack-activate" audience="Frontier" body="Turns hstack on and keeps asking for a worker model until you name a valid, smaller one.">
        <ActivateDemo />
      </SkillShell>
      <SkillShell name="hstack" audience="Frontier" body="The senior engineer: size gate, brief, plan review, build review, one correction round.">
        <BriefChecklistDemo />
      </SkillShell>
      <SkillShell name="hstack-swarm" audience="Frontier" body="Parallel workers on independent parts, then an independent reviewer that tries to break the result.">
        <SwarmDemo />
      </SkillShell>
      <SkillShell name="hstack-practice" audience="Worker" body="Engineering habits small models lack: exact specs, state tables, tests first, honest reports.">
        <PracticeDemo />
      </SkillShell>
    </div>
  );
}
