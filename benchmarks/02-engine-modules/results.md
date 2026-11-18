# Benchmark 2: six engine modules (2026-11-18)

**Result: hstack was 10% cheaper than Claude alone, at the same quality, even though one of six workers crashed and the orchestrator had to write that module itself.** The thin-brief rule added after benchmark 1 cut planning cost by 58%. Without the crash, the estimated saving is about 25-30%. hstack took 4× longer in wall-clock time.

Raw numbers are in [`results.raw.json`](results.raw.json). The task is in [`base/BENCH-SPEC.md`](base/BENCH-SPEC.md) and the hidden suite in [`hidden/acceptance.test.ts`](hidden/acceptance.test.ts).

## Task

Six independent TypeScript modules with tests:
- a Markdown renderer
- a cron next-run calculator
- a JSONPath query engine
- a Myers line diff with unified output
- a Mustache-subset template renderer
- an arithmetic expression evaluator

The spec is about 1,500 words with exact signatures and examples. The quality gate is a hidden suite of 82 tests plus `tsc --noEmit`.

## Results

| | Claude alone | hstack: plan (Opus) | hstack: workers (Muse) | hstack: verify (Opus) | hstack total |
|---|---:|---:|---:|---:|---:|
| Opus output tokens | 26,410 | 3,801 | | 10,786 | 14,587 |
| Opus cache reads | 517,474 | 275,970 | | 652,703 | 928,673 |
| Opus 1h cache writes | 57,274 | 32,291 | | 20,911 | 53,202 |
| Muse input (cached) | | | 5,048,943 (4,657,978) | | |
| Muse output + reasoning | | | 97,360 + 54,333 | | |
| **Cost** | **$1.09** | $0.39 | $0.08 | $0.51 | **$0.98** |
| Turns | 15 | 9 | 6 runs | 12 | |
| Wall time | 4.3 min | 0.7 min | ~14 min | 2.2 min | 17 min |
| Code written (src, incl. tests) | 1,750 lines | | | | 2,825 lines |
| Hidden acceptance | **82/82**, tsc ok | | | | **82/82**, tsc ok |

The cost breakdown:
- **Total:** hstack $0.98 against Claude alone at $1.09, **10% cheaper**, with identical hidden-test results.
- **Planning:** thin briefs worked. The planner wrote 923 words of task files for a 1,500-word spec, and planning cost **$0.39**, against $0.92 in benchmark 1, which had a smaller spec.
- **Workers:** six Muse workers cost **8 cents** for 5M input tokens (92% cached) and 150k output and reasoning tokens.
- **Crash:** the Markdown worker failed on the provider's side (8 consecutive `net-reset` stream errors over 13.5 minutes, then Muse's 12-minute ceiling). The orchestrator wrote `markdown.ts` and its tests itself during verification. That is most of the verify phase's 10.8k output tokens (benchmark 1's verify used 3.1k).
- **Wall time:** hstack took 17 minutes against 4.3, almost all of it the crashed worker's retries. The other five finished well before it.

## Estimated clean run (not measured)

With a working Markdown worker, verify would have looked like benchmark 1's: about 3k output tokens, or about $0.30. That would make the total about $0.39 + $0.30 + $0.09 ≈ **$0.78, about 28% cheaper** than Claude alone.

## What this run changed in hstack

- `scripts/run.sh` now retries a crashed worker automatically (`WORKER_RETRIES`, default 1) before giving up, so provider stream errors don't fall back on expensive orchestrator tokens.

## Takeaways so far

1. **Planning output is the cost driver.** Thin briefs moved hstack from 1.7× more expensive (benchmark 1) to 10% cheaper (benchmark 2).
2. **Small-model coding is nearly free.** Across both benchmarks, all worker coding cost 12 cents.
3. **The orchestrator's verify-and-fix pass is the safety net,** and it's where failures cost money. Worker reliability (retries, smaller packages) matters for cost, not only correctness.
4. **Opus alone is fast and compact** on well-specified tasks. hstack's advantage should grow as tasks get larger and as worker skills remove repeated instructions from briefs, which is on the roadmap.

## Reproduce

```bash
benchmarks/run.sh benchmarks/02-engine-modules solo
benchmarks/run.sh benchmarks/02-engine-modules hstack
python3 benchmarks/cost.py benchmarks/.work/02-engine-modules/results
```
