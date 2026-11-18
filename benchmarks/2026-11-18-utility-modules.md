# Benchmark 1: four utility modules (2026-11-18)

**Result: hstack cost 1.7× more than Claude alone on this task.** Both produced fully correct code. The task was too small and too precisely specified for delegation to pay off, and the orchestrator spent most of its budget re-writing an already precise spec into long worker briefs. Findings and fixes are below. Raw numbers are in [`2026-11-18-utility-modules.raw.json`](2026-11-18-utility-modules.raw.json) and the harness is in [`harness/`](harness/).

## Task

[`BENCH-SPEC.md`](harness/BENCH-SPEC.md): four independent TypeScript modules with their own tests: `slugify`, a semver parser with comparison and ranges, an RFC 4180 CSV parser and stringifier, and a token bucket plus sliding-window rate limiter. Roughly 850-1,300 lines including tests. The spec is about 900 words and gives exact signatures and input-to-output examples.

Quality gate: a hidden acceptance suite ([`acceptance.test.ts`](harness/acceptance.test.ts), 33 tests) that neither run saw, plus `tsc --noEmit`.

## Setup

| | Claude alone | hstack |
|---|---|---|
| Large model | Claude Opus 5.5 via `claude -p` | Claude Opus 5.5 via `claude -p`, plan run then verify run (resumed session) |
| Small model | none | Muse Spark 1.3 Contributor via `muse exec --json`, 4 workers in parallel, headless |
| Tools | Read, Write, Edit, Glob, Grep, Bash | same |
| Prompt | "Implement BENCH-SPEC.md, done when tsc and vitest pass" | plan: write 4 task files with the hstack skills; scripts launch the workers; verify: hstack-verify, merge, fix |

Token counts are exact: Claude from `--output-format json` (`usage`, per run), Muse from the `run_usage` events.

Prices per 1M tokens:
- **Claude Opus 5.5 (standard API):** $4 input, $20 output (thinking included), $5 for 5-minute cache writes, $8 for 1-hour cache writes (what Claude Code uses), $0.20 for cache reads. These prices reproduce the Claude CLI's own reported cost exactly.
- **Muse Spark 1.3 Contributor:** $0.10 input, $0.002 cached input, $0.20 output.
- **Conservative choice:** Muse reasoning tokens are billed as extra output.

## Results

| | Claude alone | hstack: plan (Opus) | hstack: workers (Muse) | hstack: verify (Opus) | hstack total |
|---|---:|---:|---:|---:|---:|
| Opus output tokens | 17,192 | 20,448 | | 3,080 | 23,528 |
| Opus cache reads | 264,408 | 538,108 | | 397,703 | 935,811 |
| Opus cache writes (1h) | 39,957 | 50,464 | | 13,215 | 63,679 |
| Muse input (cached) | | | 2,081,827 (1,856,040) | | 2,081,827 |
| Muse output + reasoning | | | 48,223 + 26,724 | | 74,947 |
| **Cost** | **$0.72** | $0.92 | $0.04 | $0.25 | **$1.21** |
| Turns | 11 | 12 | 4 runs | 5 | |
| Wall time | 3 min | 4 min | ~4 min | 0.6 min | 8.8 min |
| Hidden acceptance | 33/33, tsc ok | | | | 33/33, tsc ok |

On these numbers:
- **The code writing itself was almost free.** Four Muse workers wrote all four modules and their tests for **4 cents**, about 2M input tokens (89% cached) and 75k output and reasoning tokens.
- **The orchestrator's planning was the expensive part.** It wrote about 4,300 words of task files (about 5× the 900-word spec) and produced more output tokens (20.4k) than Claude alone did building the whole thing (17.2k).
- **Verification was cheap:** 3k output tokens, mostly reading diffs from cache.
- **Quality was identical.** Both runs passed every hidden test.

## Why hstack lost here

1. **The spec was already a perfect brief.** It had exact signatures and examples, so restating it per worker added cost without adding information.
2. **The output was small.** About 17k Opus output tokens to build the whole thing directly. Delegation only saves money when the code to write is much larger than the brief.
3. **The orchestrator read a lot of context to plan:** four skill and template files, re-read across turns.

## Fixes made to hstack after this run

- `hstack` now has a size gate. Delegate only when the expected code output is at least 5× the briefs needed to describe it. For one well-specified module-sized job, do it yourself.
- `hstack-plan` now prefers **thin briefs that point to the spec** ("implement section 3 of BENCH-SPEC.md, its examples are your tests") over restating it, when the spec already meets the brief checklist.

## Expected break-even (hypothesis, not measured)

If the plan phase had written thin briefs (about 2k output tokens and fewer turns), the hstack total would be roughly $0.20 (plan) + $0.25 (verify) + $0.04 (Muse), about **$0.49, roughly 30% cheaper** than Claude alone, at the same quality. The savings should grow with the size of the code relative to the spec: large features, test suites, and multi-file refactors. The next benchmark will test exactly that, with the updated skills and a larger task.

## Reproduce

```bash
# edit paths at the top of harness/bench.sh, then
./bench.sh solo
./bench.sh hstack
python3 cost.py results
```
