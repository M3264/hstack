import { Face } from "./face";

// A real hstack run (benchmark 1), condensed from its checkpoint files.
const agents = [
  { name: "Wonder", role: "frontier", color: "var(--frontier)", note: "waits for checkpoints" },
  { name: "Spark lead", role: "small model", color: "var(--small)", note: "owns spec, plan, tests" },
  { name: "Builders ×6", role: "sub-agents", color: "#e9895a", note: "one module each" },
  { name: "Reviewer", role: "sub-agent", color: "#e87ba4", note: "tries to break it" },
];

type Msg = { who: "frontier" | "lead" | "system"; time: string; text: React.ReactNode };
const thread: Msg[] = [
  { who: "frontier", time: "0:34", text: <>Intake. Implement the six engine modules exactly as BENCH-SPEC.md says. Done when <code>tsc</code> and <code>vitest</code> pass. I&apos;ll review exact strings, diff hunks and cron weekday rules.</> },
  { who: "lead", time: "1:14", text: <>Plan: 6 sub-agents in parallel, one module each. Tests first, one named test per spec example. Then I integrate and run an independent reviewer. Approve?</> },
  { who: "frontier", time: "1:37", text: <>APPROVE</> },
  { who: "system", time: "", text: <>6 builders working · 141 tests written · reviewer found 2 bugs</> },
  { who: "lead", time: "11:12", text: <>Done. The reviewer caught a template lookup bug and a cron weekday mismatch. Both fixed, with 4 regression tests. <code>tsc</code> clean · 141/141 passing.</> },
  { who: "frontier", time: "11:35", text: <>Ran the checks myself. APPROVE</> },
];

export function ProductWindow() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_40px_120px_-40px_rgba(57,135,229,0.25)]">
      <div className="grid md:grid-cols-[300px_minmax(0,1fr)]">
        {/* Agents */}
        <aside className="border-b border-line p-5 md:border-b-0 md:border-r">
          <div className="mb-5 flex gap-2" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
            {agents.map((a, i) => (
              <li key={a.name} className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-center ${i === 0 ? "bg-surface-2" : ""}`}>
                <Face size={52} color={a.color} />
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-ink-3">{a.note}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-2xl border border-line p-3 font-mono text-xs leading-relaxed text-ink-2">
            <div className="flex justify-between"><span>frontier wrote</span><span className="text-ink">9k tokens</span></div>
            <div className="flex justify-between"><span>small model wrote</span><span className="text-ink">168k tokens</span></div>
            <div className="mt-1 flex justify-between border-t border-line pt-1"><span>cost</span><span className="text-ink">$1.59 <span className="text-ink-3">vs $2.46</span></span></div>
          </div>
        </aside>

        {/* Thread */}
        <section className="min-w-0 p-5 sm:p-6" aria-label="Checkpoint thread from a real hstack run">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm">
              <Face size={18} color="var(--small)" />
              six engine modules
            </div>
            <span className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-ink-2">82/82 hidden tests</span>
          </div>
          <ol className="flex flex-col gap-3">
            {thread.map((m, i) => (
              <li
                key={i}
                className={`fade-up flex ${m.who === "frontier" ? "justify-end" : m.who === "system" ? "justify-center" : "justify-start"}`}
                style={{ animationDelay: `${0.25 + i * 0.35}s` }}
              >
                {m.who === "system" ? (
                  <span className="rounded-full border border-dashed border-line px-3 py-1 font-mono text-xs text-ink-3">{m.text}</span>
                ) : (
                  <div className={`flex max-w-[88%] items-end gap-2 ${m.who === "frontier" ? "flex-row-reverse" : ""}`}>
                    <Face size={26} color={m.who === "frontier" ? "var(--frontier)" : "var(--small)"} className="shrink-0" />
                    <div className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed [&_code]:font-mono [&_code]:text-[13px] ${m.who === "frontier" ? "bg-frontier/15 text-ink" : "bg-surface-2 text-ink"}`}>
                      <div className="mb-0.5 font-mono text-[11px] text-ink-3">
                        {m.who === "frontier" ? "Wonder · frontier" : "Spark lead"} · {m.time}
                      </div>
                      {m.text}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
