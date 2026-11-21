# hstack benchmarks

Each benchmark runs the same task two ways, in separate Claude Code sessions, and measures exact cost per model:

- **solo:** the frontier model (default `claude-opus-5-5`) does everything.
- **hstack:**
  1. The frontier writes a brief.
  2. One `Agent`-tool worker on a smaller model (default `haiku`) plans, builds, tests and reports.
  3. The frontier approves the plan, reviews the result, and sends at most one correction round.

The quality gate is a hidden acceptance suite that neither side sees, plus `tsc --noEmit`. Every result is published, wins and losses alike.

| # | Task | Frontier alone | hstack | Hidden tests |
|---|---|---:|---:|---|
| [02](02-waitlist-backend/results.md) | Production waitlist backend (Opus 5.5 directs Haiku 5.5) | $1.59 | **$0.75 (-53%)** | 20/20 · 20/20 |
| [01](01-engine-modules/results.md) | Six engine modules, earlier Muse version of hstack | $2.46 | $1.59 (-35%) | 82/82 · 82/82 |

Benchmark 1 ran on the earlier Muse Code implementation, which has since been removed. Its runner is in git history at commit `3c16879`.

## Run benchmark 2

Requirements: `claude` on your `PATH`, `node`/`npm` (Node 22.5+ for `node:sqlite`), `python3`. It spends real usage on your Claude account; `BUDGET` caps each run (default $30). A run that hits a usage limit stops with an error instead of recording bad numbers.

```bash
cd ~/hstack
benchmarks/run-claude.sh benchmarks/02-waitlist-backend solo
benchmarks/run-claude.sh benchmarks/02-waitlist-backend hstack      # can run in parallel
python3 benchmarks/cost-claude.py benchmarks/.work/02-waitlist-backend-claude/results
```

Options:
- `FRONTIER_MODEL` (default `claude-opus-5-5`)
- `WORKER_MODEL`, any Agent-tool alias (default `haiku`)

Costs come from Claude Code's own report (`modelUsage[].costUSD`, list prices). Every sub-agent's model is included.

## Layout

```
benchmarks/
  run-claude.sh, cost-claude.py
  NN-name/
    base/      starting project + BENCH-SPEC.md (the task)
    hidden/    acceptance suite, copied in only after a run
    results.md, results.raw.json
  .work/       git-ignored runs and raw outputs
```
