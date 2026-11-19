# Benchmark 1: six engine modules (2026-11-19)

**Result: hstack was 35% cheaper than the frontier model alone, at identical quality (82/82 hidden tests on both). The small model did nearly all the work for 10 cents.**

- Frontier: `muse-wonder-1.0`. Small model: `muse-spark-1.3-contributor`. Both run in Muse Code.
- The task: [`base/BENCH-SPEC.md`](base/BENCH-SPEC.md), six independent TypeScript modules with tests (Markdown renderer, cron scheduler, JSONPath, Myers diff, Mustache-subset templates, expression evaluator).
- The quality gate: the hidden suite [`hidden/acceptance.test.ts`](hidden/acceptance.test.ts) (82 tests) plus `tsc --noEmit`.
- Raw numbers are in [`results.raw.json`](results.raw.json). The full checkpoint conversation is in [`checkpoints/`](checkpoints/).

## Results

| | Frontier alone (Wonder) | hstack: frontier (Wonder) | hstack: small (Spark, lead + 7 sub-agents) | hstack total |
|---|---:|---:|---:|---:|
| Model calls | 48 | 39 (4 checkpoint sessions) | 215 | |
| Input tokens (cached) | 1,482,952 (1,199,376) | 636,741 (327,164) | 4,643,190 (4,066,565) | |
| Output + reasoning | 38,111 + 16,274 | 5,965 + 3,300 | 106,489 + 61,657 | |
| **Cost** | **$2.46** | $1.49 | **$0.10** | **$1.59 (-35%)** |
| Hidden acceptance | 82/82, tsc ok | | | 82/82, tsc ok |
| Wall time | 4.3 min | | | 12.4 min |

## What happened

1. **Intake (frontier, $0.38):** Wonder wrote the acceptance criteria and pointed to the spec, without restating it.
2. **Plan (small):** the Spark lead wrote the spec and plan, and decided to fan out to **6 parallel sub-agents** (one per independent module). Its plan event was 9 lines.
3. **Plan review (frontier, $0.46):** `APPROVE`.
4. **Build (small):** six sub-agents wrote the modules and 141 tests. A seventh, independent reviewer sub-agent found 2 real defects (a dotted-name lookup bug in the template engine, and a weekday-name inconsistency in cron). The lead fixed both and kept 4 new regression tests.
5. **Done review (frontier, $0.46):** Wonder ran the checks itself, then `APPROVE`.
6. **Merge (frontier, $0.18).**

The frontier's whole written contribution was the intake and two words: `APPROVE`, `APPROVE`.

## Where the cost still is

The small model's entire share was **$0.10**: 4.6M tokens, 88% cached, 215 calls.

Of the frontier's $1.49:

| Part of the frontier's cost | Cost | Share |
|---|---:|---:|
| Uncached input (310k tokens at $4/M) | $1.24 | 83% |
| Output and reasoning (9.3k tokens) | $0.19 | 12% |
| Cached input | $0.07 | 5% |

Most of the frontier's cost was **reading**, not writing. Each checkpoint started a fresh `muse exec` session, which re-loaded Muse's own system instructions, the skill file and the event context before deciding.

## Next levers (not measured yet)

- Keep **one frontier session** across checkpoints so its context stays cached ($0.20/M instead of $4/M). That targets the 83%.
- Give the frontier a **smaller checkpoint context**: the event file and a compact skill summary instead of the full skill each time.
- On a well-specified task like this one, a reviewed plan that matches the intake may be approvable without loading the whole spec.

## Reproduce

```bash
benchmarks/run.sh benchmarks/01-engine-modules solo
benchmarks/run.sh benchmarks/01-engine-modules hstack
python3 benchmarks/cost.py benchmarks/.work/01-engine-modules/results
```

Small-model usage includes every sub-agent: `cost.py` reads Muse's session store (`~/.local/share/muse/sessions/.../subagent/*`), because `muse exec --json` reports only the top-level run. Both sides are counted the same way.
