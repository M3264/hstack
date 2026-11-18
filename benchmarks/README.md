# hstack benchmarks

Each benchmark runs the same task two ways and measures exact token usage and cost:

- **solo:** the large model (Claude Opus via `claude -p`) does everything.
- **hstack:** the large model plans with `hstack-plan`, small workers (Muse via `muse exec --json`) build in parallel, and the large model verifies and merges with `hstack-verify`.

Quality gate: a hidden acceptance suite that neither run sees, plus `tsc --noEmit`. Every result is published here, wins and losses alike.

| # | Task | Solo | hstack | Hidden tests (solo / hstack) |
|---|---|---:|---:|---|
| [01](01-utility-modules/results.md) | 4 small utility modules | **$0.72** | $1.21 | 33/33 · 33/33 |
| [02](02-engine-modules/results.md) | 6 engine modules (Markdown, cron, JSONPath, diff, templates, expressions) | $1.09 | **$0.98** (-10%) | 82/82 · 82/82 |

## Layout

```
benchmarks/
  run.sh                 runner: run.sh <benchmark-dir> solo|hstack
  cost.py                token and cost calculator
  NN-name/
    base/                starting project, including BENCH-SPEC.md (the task)
    hidden/              acceptance suite, copied in only after a run finishes
    workers.txt          work-package names for the hstack run
    results.md           write-up (results.raw.json holds the calculator output)
  .work/                 git-ignored run folders and raw outputs
```

## Run one

Requirements: `claude` and `muse` on your `PATH`, `node`/`npm`, `python3`. Each run spends real money on your Claude account. The caps are `SOLO_BUDGET` (default $40) and `PHASE_BUDGET` (default $10 per hstack phase).

```bash
benchmarks/run.sh benchmarks/02-engine-modules solo
benchmarks/run.sh benchmarks/02-engine-modules hstack     # can run in parallel with solo
python3 benchmarks/cost.py benchmarks/.work/02-engine-modules/results
```

## Pricing used

Per 1M tokens, in `cost.py`:
- **Claude Opus 5.5 (standard API):** $4 input, $20 output (thinking included), $5 for 5-minute cache writes, $8 for 1-hour cache writes, $0.20 for cache reads.
- **Muse Spark 1.3 Contributor:** $0.10 input, $0.002 cached input, $0.20 output.

Muse reasoning tokens are billed as output (conservative). The Opus figures match the Claude CLI's own reported cost.

## Add a benchmark

Create `NN-name/` with:
- `base/`, a minimal project with `BENCH-SPEC.md`: exact signatures and input-to-output examples
- `hidden/acceptance.test.ts`
- `workers.txt`

Pick tasks where the expected code is much larger than the spec. The interesting question is where hstack's break-even point sits.
