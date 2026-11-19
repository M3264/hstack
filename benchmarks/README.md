# hstack benchmarks

Each benchmark runs the same task two ways and measures exact tokens and cost:

- **solo:** the frontier model (Muse Wonder via `muse exec`) does everything.
- **hstack:**
  1. The frontier writes a short intake.
  2. A small-model lead (Muse Spark, `muse exec --json --trust-workspace`) writes the spec, plan, tests and code, with its own sub-agents.
  3. The frontier answers each checkpoint in one call per event, and approves the result.

The quality gate is a hidden acceptance suite that neither side sees, plus `tsc --noEmit`. Every result is published, wins and losses alike.

| # | Task | Frontier alone | hstack | Hidden tests |
|---|---|---:|---:|---|
| [01](01-engine-modules/results.md) | Six engine modules: Markdown, cron, JSONPath, diff, templates, expressions | $2.46 | **$1.59 (-35%)** | 82/82 · 82/82 |

## Run benchmark 1

Requirements: `muse` on your `PATH`, `node`/`npm`, `python3`. It spends real usage on your Muse account. Choose the models with `FRONTIER_MODEL` (default `muse-wonder-1.0`) and `SMALL_MODEL` (default `muse-spark-1.3-contributor`). A failed call stops the run instead of recording bad numbers.

```bash
cd ~/hstack
benchmarks/run.sh benchmarks/01-engine-modules solo
benchmarks/run.sh benchmarks/01-engine-modules hstack      # can run in parallel with solo
python3 benchmarks/cost.py benchmarks/.work/01-engine-modules/results
```

For the hstack run, a progress window opens showing the lead's checkpoints and files. The run also saves:
- the full checkpoint conversation (events and directives), in `results/hstack-checkpoints/`
- the frontier's cost per call, in `cost.py`'s output

## Pricing used (`cost.py`)

Per 1M tokens (cached / input / output):
- **Muse Wonder 1.0:** $0.20 / $4 / $20
- **Muse Spark 1.3 Contributor:** $0.002 / $0.10 / $0.20
- **Muse Spark 1.3:** $0.15 / $1.25 / $4.25

Reasoning tokens are billed as output, which is conservative. Usage includes every sub-agent: `muse exec --json` reports only the top-level run, so `cost.py` reads Muse's session store.

## Layout

```
benchmarks/
  run.sh, cost.py
  01-engine-modules/
    base/      starting project + BENCH-SPEC.md (the task)
    hidden/    acceptance suite, copied in only after a run
  .work/       git-ignored runs and raw results
```
