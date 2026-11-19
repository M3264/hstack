# How hstack got here

hstack went through three designs in two days. Each one was benchmarked against a frontier model doing the same task alone, with exact token counts and a hidden acceptance suite neither side saw. This page records what each design did, what it measured, and what changed to bring the cost down.

All costs are USD per task, computed from exact token counts:
- **Claude Opus 5.5:** $4 per 1M input and $20 per 1M output. Cache writes cost $5 (5-minute) or $8 (1-hour), and cache reads $0.20.
- **Muse Wonder 1.0:** $0.20 cached, $4 input, $20 output per 1M tokens.
- **Muse Spark 1.3 Contributor:** $0.002 cached, $0.10 input, $0.20 output per 1M tokens.

## At a glance

| Design | Frontier | Small model | Best benchmark | vs. frontier alone | Hidden tests |
|---|---|---|---|---:|---|
| v1: frontier plans, small models build | Claude Opus 5.5 | Muse Spark 1.3 Contributor (parallel workers) | Six engine modules: **$0.98** vs $1.09 | **-10%** | 82/82 · 82/82 |
| v2: small model also writes the briefs and reviews | Claude Opus 5.5 | Muse Spark 1.3 Contributor | Six engine modules, partial run: $0.43 so far | not measured | 82/82 |
| **v3 (current): small model leads, frontier directs** | **Muse Wonder 1.0** | **Muse Spark 1.3 Contributor (lead + sub-agents)** | Six engine modules: **$1.59** vs $2.46 | **-35%** | 82/82 · 82/82 |

v1 and v2 used Claude Opus as the frontier, and v3 uses Muse Wonder. Their list prices are close, but caching differs, so compare the percentages rather than the dollar figures across designs.

---

## v1: the frontier plans, small models build

**Idea:** a big model does the thinking, and cheap models do the typing.
1. The frontier (Claude Opus) wrote the spec, froze shared contracts and stubs, and wrote one detailed task file per worker.
2. Muse workers built in parallel, each in its own git worktree.
3. The frontier reviewed every patch, merged, and ran real end-to-end tests.

**First real use:** a full social layer for a portfolio site: email sign-in, likes, comments and posts.
- 4 workers wrote about 8,600 lines and 300 passing tests.
- The frontier's verification still caught 5 real bugs that the workers' mocked tests missed: wrong database driver types, an over-strict request check, a prerendered login route, and two token-security flaws.
- That run showed the case for the gate: cheap models for volume, a strong model to check.

**Benchmarks:**

| Benchmark | Frontier alone | hstack v1 | Result |
|---|---:|---:|---|
| Four small utility modules | $0.72 | $1.21 | **+68% (lost)**. The frontier wrote 4,300 words of briefs for a 900-word spec and spent more on them than on the code. |
| Six engine modules (after the thin-brief rule) | $1.09 | **$0.98** | **-10%**, the best v1 result. Planning fell from $0.92 to $0.39. One worker crashed on network errors, and the frontier wrote that module itself. |

**What we learned:** small-model coding was almost free. All the worker coding across both runs cost 12 cents. The money went to the frontier writing text: briefs, fixes and reviews.

## v2: take the writing away from the frontier

**Changes:**
- The frontier wrote only a short split, at most 5 lines per package.
- A small model turned the split into the task files.
- A mechanical gate checked each package: type checks, tests, and a small-model reviewer per package, with one automatic fix round.
- The frontier read only the gate's summary and merged. It was told never to write product code.

**Benchmark (partial):** the frontier's split cost **$0.28**. Muse drafted the briefs, built all six modules and reviewed them for **$0.14** (13 runs). The merged result scored **82/82**. The solo baseline and the frontier's final confirm step weren't measured, because the Claude account hit its usage limit mid-run. That's why v2 has no headline number.

## v3 (current): the small model leads, the frontier directs

**Idea:** the small model does everything it can, and the frontier acts as a senior engineer that decides why and what and checks the how.
1. The frontier writes an intake of about 20 lines: why, acceptance criteria, constraints, and the risks it will review.
2. A small-model lead (Muse Spark):
   - writes the spec, the plan and a criteria-to-tests map
   - decides how many sub-agents to use (1 to N)
   - writes tests first, then the code
   - runs an independent reviewer sub-agent
3. The frontier wakes only at checkpoints (plan, done) and answers `APPROVE` or `REVISE` in at most 10 lines. Waiting costs no tokens.
4. The frontier approves the result, and the worktree is merged.

**Benchmark: six engine modules** ([details](../benchmarks/01-engine-modules/results.md)):

| | Frontier alone (Wonder) | hstack v3 |
|---|---:|---:|
| Cost | $2.46 | **$1.59**: Wonder $1.49 + Spark $0.10 |
| Hidden tests | 82/82 | 82/82 |
| Frontier's written output | the whole build | an intake + `APPROVE` + `APPROVE` |

The small-model lead fanned out to 6 parallel builders. Its own reviewer sub-agent found 2 real bugs, and the lead fixed them before the frontier looked.

---

## What brought the cost down

In the order they were introduced:

1. **Thin briefs.** Point workers at the spec instead of restating it. v1 planning cost fell from $0.92 to $0.39.
2. **A size gate.** Only delegate when the code to write is far larger than the instructions needed to describe it.
3. **Worker retries.** A crashed worker is re-run instead of falling back on the frontier to write the code, which was the most expensive failure mode.
4. **No more briefs from the frontier.** It writes a few lines; a small model drafts the task files (v2).
5. **A mechanical quality gate.** Scripts and a small-model reviewer check the work, and the frontier reads a summary, not the patches (v2).
6. **No code from the frontier, ever.** Problems go back to the small model as `REVISE` with the exact defect (v2, v3).
7. **The small model owns spec, plan, tests and fan-out.** The frontier keeps only intake and approvals (v3).
8. **Event-driven waiting.** The frontier sleeps between checkpoints with no polling, so waiting costs nothing (all versions).
9. **Honest accounting.** Sub-agent tokens are read from Muse's session store, because `muse exec --json` reports only the top-level run. This raised v3's measured cost from $1.26 to $1.59 and lowered its saving from 46% to 35%, but the numbers are now complete.

## Where the cost is now, and what's next

In v3 the small model's share is 6% of the bill. The other 94% is the frontier, and 83% of that is **reading context**: Muse's system instructions and the skill file, re-read at the full input price on each of 4 fresh sessions. The frontier writes almost nothing.

**Next: a skill bank for the small model.** The more the small model knows on its own (stack conventions, testing patterns, security, framework and driver behavior), the less the frontier has to correct, and the fewer checkpoints it needs. Skills are read by the cheap model at cheap-model prices.

**Then the frontier optimizations (estimates, not measured):**

| Optimization | Expected effect |
|---|---|
| One persistent frontier session across checkpoints, so context is re-read from cache | -$0.80 to -$1.00 |
| Merge by script, not by the frontier | -$0.18 |
| A lighter frontier base prompt (Muse presets) | to be measured |
| Skip the plan checkpoint for low-risk tasks | about -$0.40 per call |
| Parallel per-module reviewers, so the review overlaps the build | about -4 minutes of wall time |

Together these could bring hstack to roughly $0.40–0.60 against $2.46, about 75–85% cheaper. Each one will be measured and published in [`benchmarks/`](../benchmarks/).
