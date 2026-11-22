import { Face } from "./face";

// A real hstack run (benchmark 2), condensed from the session.
const agents = [
  { name: "Opus", role: "frontier", color: "var(--frontier)", note: "briefs and reviews" },
  { name: "Haiku worker", role: "worker", color: "var(--small)", note: "plans, tests, builds" },
];

type Msg = { who: "frontier" | "lead" | "system"; time: string; text: React.ReactNode };
const thread: Msg[] = [
  { who: "frontier", time: "0:20", text: <>Brief. Build the waitlist backend in BENCH-SPEC.md. Done when <code>tsc</code> and <code>vitest</code> pass. I&apos;ll review the rate limiter, CSV formula guard, cursor and signup check order.</> },
  { who: "lead", time: "1:05", text: <>Plan in PLAN.md: SQLite store, pure handlers, tests first for every spec example and error code. ASK: approve</> },
  { who: "frontier", time: "1:12", text: <>APPROVE: build it</> },
  { who: "system", time: "", text: <>Haiku working · 199 tests written</> },
  { who: "lead", time: "5:40", text: <>Done. <code>tsc</code> clean · 199/199 passing.</> },
  { who: "frontier", time: "6:10", text: <>Ran the checks. One bug: re-signup with a pending email replaces the unsubscribe token, so the first email&apos;s link breaks. Keep the token; add a regression test.</> },
  { who: "lead", time: "7:20", text: <>Fixed, with a regression test. All tests pass.</> },
  { who: "frontier", time: "7:50", text: <>APPROVE</> },
];

export function ProductWindow({ highlight, limit }: { highlight?: number[]; limit?: number }) {
  const visible = thread.map((m, i) => ({ m, i })).filter(({ i }) => limit === undefined || i < limit);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface ">
      <div className="grid md:grid-cols-[300px_minmax(0,1fr)]">
        {/* Agents */}
        <aside className="border-b border-line p-5 md:border-b-0 md:border-r">
          <div className="mb-5 flex gap-2" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <ul className="grid grid-cols-2 gap-2">
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
            <div className="flex justify-between"><span>frontier wrote</span><span className="text-ink">4k tokens</span></div>
            <div className="flex justify-between"><span>worker wrote</span><span className="text-ink">106k tokens</span></div>
            <div className="mt-1 flex justify-between border-t border-line pt-1"><span>cost</span><span className="text-ink">$0.75 <span className="text-ink-3">vs $1.59</span></span></div>
          </div>
        </aside>

        {/* Thread */}
        <section className="min-w-0 p-5 sm:p-6" aria-label="Checkpoint thread from a real hstack run">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm">
              <Face size={18} color="var(--small)" />
              waitlist backend
            </div>
            <span className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-2">20/20 hidden tests</span>
          </div>
          <ol className="flex flex-col gap-3">
            {visible.map(({ m, i }) => (
              <li
                key={i}
                className={`fade-up flex ${m.who === "frontier" ? "justify-end" : m.who === "system" ? "justify-center" : "justify-start"} ${highlight && !highlight.includes(i) ? "opacity-40" : ""}`}
                style={{ animationDelay: `${0.25 + i * 0.35}s` }}
              >
                {m.who === "system" ? (
                  <span className="rounded-full border border-dashed border-line px-3 py-1 text-xs text-ink-3">{m.text}</span>
                ) : (
                  <div className={`flex max-w-[88%] items-end gap-2 ${m.who === "frontier" ? "flex-row-reverse" : ""}`}>
                    <Face size={26} color={m.who === "frontier" ? "var(--frontier)" : "var(--small)"} className="shrink-0" />
                    <div className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed [&_code]:font-mono [&_code]:text-[13px] ${m.who === "frontier" ? "bg-frontier/15 text-ink" : "bg-surface-2 text-ink"}`}>
                      <div className="mb-0.5 text-[11px] text-ink-3">
                        {m.who === "frontier" ? "Opus · frontier" : "Haiku worker"} · {m.time}
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
