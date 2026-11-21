# Benchmark 2: production-grade waitlist backend, in Claude Code (2026-11-21)

**Result: hstack was 53% cheaper than Claude Opus 5.5 working alone, at identical quality (20/20 hidden tests and a clean type check on both).** Opus directed one Claude Haiku 5.5 worker sub-agent inside Claude Code and wrote 90% fewer output tokens than when it built the backend alone.

- Frontier: `claude-opus-5-5`. Worker: Claude Haiku 5.5, through the Agent tool's `haiku` model.
- The task: [`base/BENCH-SPEC.md`](base/BENCH-SPEC.md), a waitlist backend with:
  - double opt-in email confirmation
  - referral ranking
  - per-IP rate limiting
  - unsubscribe
  - an admin API with cursor pagination, invites, and CSV export with a formula-injection guard
  - SQLite persistence, with no runtime dependencies
- The quality gate: the hidden suite [`hidden/acceptance.test.ts`](hidden/acceptance.test.ts) (20 tests) plus `tsc --noEmit`.
- Raw numbers are in [`results.raw.json`](results.raw.json). Costs are Claude Code's own per-model list-price figures (`modelUsage.costUSD`), sub-agents included.

## Results

| | Opus alone | hstack: Opus (frontier) | hstack: Haiku (worker) | hstack total |
|---|---:|---:|---:|---:|
| Output tokens | 39,806 | 4,047 | 106,081 | |
| Cache reads | 1,240,348 | 531,709 | 2,562,800 | |
| Cache writes | 67,962 | 33,864 | 156,631 | |
| **Cost** | **$1.59** | $0.46 | $0.30 | **$0.75 (-53%)** |
| Hidden acceptance | 20/20, tsc ok | | | 20/20, tsc ok |
| Tests written by the builder | part of 1,865 lines | | 199 tests, 2,208 lines | |
| Wall time | 5.5 min | | | 7.9 min |

## What happened

1. **Intake:** Opus wrote a short intake that points to the spec sections.
2. **Plan:** the Haiku worker explored the project, wrote `PLAN.md`, and returned a plan report. Opus approved it.
3. **Build:** Haiku wrote tests first, then the implementation, and reported 199 passing tests.
4. **Review:** Opus ran the checks itself and spot-checked its risk areas: the rate limiter, CSV quoting and the formula guard, the cursor, position ordering, the order of signup checks, and the body-size limit.
5. **One correction round:** Opus caught a real bug. Re-signing with a pending email replaced the unsubscribe token, which broke the first email's unsubscribe link. Haiku fixed it and added a regression test.
6. **Report:** Opus listed its remaining spec interpretations (for example, the exact `Allow` header for `/api/waitlist`).

Opus never wrote product code. Its contribution was an intake, one `APPROVE`, one correction, and the reviews.

## How this compares to benchmark 1

| | Benchmark 1 (Muse) | Benchmark 2 (Claude Code) |
|---|---|---|
| Frontier / worker | Muse Wonder / Muse Spark 1.3 Contributor | Claude Opus 5.5 / Claude Haiku 5.5 |
| How the worker ran | `muse exec` lead with 7 sub-agents | one Agent-tool sub-agent, continued with follow-up messages |
| Saving vs. frontier alone | -35% | **-53%** |
| Frontier share of hstack cost | 94% | 61% |

In-harness orchestration helps because the frontier keeps **one session with a warm cache** across checkpoints instead of starting fresh calls. That was the biggest cost identified in benchmark 1.

## Caveats

- One run per side.
- hstack took 1.4× longer in wall time.
- This run drove the hstack loop from the benchmark prompt, not yet from an installed Claude Code skill.
- Claude Code's internal helper calls appear as a few tenths of a cent of Haiku usage in the solo run too.

## Reproduce

```bash
benchmarks/run-claude.sh benchmarks/02-waitlist-backend solo
benchmarks/run-claude.sh benchmarks/02-waitlist-backend hstack
python3 benchmarks/cost-claude.py benchmarks/.work/02-waitlist-backend-claude/results
```
