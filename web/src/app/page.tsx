import Image from "next/image";
import { CopyButton } from "@/components/copy-button";
import { CostMeters } from "@/components/cost-meters";
import { Nav } from "@/components/nav";
import { ProductWindow } from "@/components/product-window";
import { BENCHMARK, GITHUB, HISTORY, INSTALL_CMD, INSTALL_FROM_SOURCE } from "@/lib/site";

const steps = [
  { who: "Frontier", color: "text-frontier", title: "Writes the brief", body: "About 15 lines: why, acceptance criteria, constraints, the risks it will check, and the done commands. No code." },
  { who: "Small model", color: "text-small", title: "Does the engineering", body: "A worker sub-agent on a smaller model plans, writes tests first, builds, and reports. /hstack-swarm splits the work across parallel workers and a reviewer." },
  { who: "Frontier", color: "text-frontier", title: "Reviews and directs", body: "Approves the plan, runs the checks itself, spot-checks its risks, and sends at most one short correction. It never writes the code." },
];

const skills = [
  { name: "hstack-activate", for: "frontier", body: "Turns hstack on and keeps asking for a worker model until you name a valid, smaller one. Loose names like \"haiku 5.5\" work." },
  { name: "hstack", for: "frontier", body: "The senior engineer: size gate, brief, plan review, build review, one correction round, token discipline." },
  { name: "hstack-swarm", for: "frontier", body: "Parallel workers on independent parts, then an independent reviewer that tries to break the result." },
  { name: "hstack-practice", for: "worker", body: "Engineering habits small models lack: exact specs, state tables, tests first, real-environment facts, security, honest reports." },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="gutter relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(57,135,229,0.14),transparent_60%)]" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
            <a href={BENCHMARK} target="_blank" rel="noreferrer" className="fade-up inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-ink-2 transition-colors hover:text-ink sm:text-sm">
              <span className="font-semibold text-ink"><span className="hidden sm:inline">Now in Claude Code: </span>53% cheaper</span><span>, same quality</span>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-xs" aria-hidden>↗</span>
            </a>
            <h1 className="fade-up mt-8 flex flex-wrap items-center justify-center gap-x-[0.25em] text-[clamp(48px,9vw,104px)] font-semibold leading-none tracking-[-0.045em]" style={{ animationDelay: "0.08s" }}>
              <span>Meet</span>
              <Image src="/logo.png" alt="" width={120} height={120} priority className="h-[0.95em] w-[0.95em]" />
              <span>hstack</span>
            </h1>
            <p className="fade-up mt-7 max-w-2xl text-[clamp(17px,2.1vw,22px)] leading-relaxed text-ink-2" style={{ animationDelay: "0.16s" }}>
              Small models do the work. Frontier models direct it. Agent skills that turn a cheap model into your engineering team and a frontier model into its senior engineer.
            </p>
            <div className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.24s" }}>
              <CopyButton text={INSTALL_CMD} label="Copy the install command" className="h-14 rounded-full bg-ink px-8 text-[17px] font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frontier">
                Install hstack
              </CopyButton>
              <a href={GITHUB} target="_blank" rel="noreferrer" className="flex h-14 items-center rounded-full bg-surface-2 px-8 text-[17px] transition-colors hover:bg-line">
                View on GitHub
              </a>
            </div>
          </div>
          <div className="fade-up relative mx-auto mt-16 max-w-6xl" style={{ animationDelay: "0.32s" }}>
            <ProductWindow />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="gutter scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-3">How it works</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(30px,4.5vw,52px)] font-semibold leading-tight tracking-[-0.03em]">
              The frontier decides why and what. The small model works out how.
            </h2>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-[20px] border border-line bg-surface p-6">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className={s.color}>{s.who}</span>
                    <span className="text-ink-3">step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 overflow-hidden rounded-[20px] border border-line bg-[#121212]">
              <Image src="/hstack-flow.png" alt="hstack workflow: the frontier writes the intake, the small-model lead plans and builds with sub-agents and an independent reviewer, and the frontier approves at the plan and done checkpoints." width={1498} height={1152} className="mx-auto h-auto w-full max-w-4xl" />
            </div>
          </div>
        </section>

        {/* Benchmark */}
        <section id="benchmark" className="gutter scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-3">Benchmark 2 · production waitlist backend</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(30px,4.5vw,52px)] font-semibold leading-tight tracking-[-0.03em]">
              Same task, same hidden tests. Half the spend.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">
              Claude Opus 5.5 directed a Claude Haiku 5.5 worker and wrote 90% fewer output tokens. Exact per-model costs, including the sub-agent, and a hidden 20-test suite neither side saw.
            </p>
            <div className="mt-10"><CostMeters /></div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
              <a href={BENCHMARK} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:text-ink">Full results and raw numbers ↗</a>
              <a href={HISTORY} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:text-ink">How we got from +68% to −53% ↗</a>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="gutter scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-3">The skills</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(30px,4.5vw,52px)] font-semibold leading-tight tracking-[-0.03em]">Four skills today. A skill bank next.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {skills.map((s) => (
                <article key={s.name} className="rounded-[20px] border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-lg">{s.name}</code>
                    <span className={`rounded-full px-2.5 py-1 font-mono text-xs ${s.for === "frontier" ? "bg-frontier/15 text-frontier" : "bg-small/15 text-small"}`}>{s.for}</span>
                  </div>
                  <p className="mt-4 leading-relaxed text-ink-2">{s.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-[20px] border border-dashed border-line p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Skill bank <span className="ml-2 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs font-normal text-ink-2">coming next</span></h3>
              </div>
              <p className="mt-2 max-w-3xl leading-relaxed text-ink-2">
                Curated skills that make the worker better on its own: testing, security, frameworks, data and UI quality. The more it knows, the less the frontier has to correct.
              </p>
            </div>
          </div>
        </section>

        {/* Install */}
        <section id="install" className="gutter scroll-mt-20 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[clamp(30px,4.5vw,52px)] font-semibold leading-tight tracking-[-0.03em]">Install in one line</h2>
            <p className="mt-3 text-ink-2">The installer links the skills and sub-agents into Claude Code and saves your default worker model. Claude Code today, more agents later.</p>
            <div className="mt-8 flex flex-col gap-3 text-left">
              {[{ k: "Install", cmd: INSTALL_CMD }, { k: "From source", cmd: INSTALL_FROM_SOURCE }].map(({ k, cmd }) => (
                <div key={k} className="rounded-2xl border border-line bg-surface p-2 pl-4">
                  <div className="flex items-center gap-3">
                    <span className="w-20 shrink-0 font-mono text-xs text-ink-3">{k}</span>
                    <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-2 font-mono text-[13px] text-ink">{cmd}</code>
                    <CopyButton text={cmd} label={`Copy: ${cmd}`} className="h-9 shrink-0 rounded-xl bg-surface-2 px-3 font-mono text-xs hover:bg-line" />
                  </div>
                </div>
              ))}
            </div>
            <ol className="mx-auto mt-8 grid max-w-xl gap-2 text-left text-sm text-ink-2">
              <li><span className="font-mono text-ink-3">1.</span> Run the installer and pick a default worker, e.g. haiku.</li>
              <li><span className="font-mono text-ink-3">2.</span> Start Claude Code on your frontier model, e.g. <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">claude --model opus</code>, and run <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">/hstack-activate</code>.</li>
              <li><span className="font-mono text-ink-3">3.</span> Give it a real task. The worker does the work; the frontier directs.</li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="gutter border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-ink-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-256.png" alt="" width={22} height={22} />
            <span>hstack · by <a href="https://shellhaki.dev" className="hover:text-ink">shellhaki</a></span>
          </div>
          <div className="flex gap-6">
            <a href={GITHUB} className="hover:text-ink">GitHub</a>
            <a href={BENCHMARK} className="hover:text-ink">Benchmarks</a>
            <a href={HISTORY} className="hover:text-ink">History</a>
          </div>
        </div>
      </footer>
    </>
  );
}
