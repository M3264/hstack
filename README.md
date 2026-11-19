# hstack

**Small models do the work. Frontier models direct it.**

hstack is a collection of agent skills that turns a frontier model into a senior engineer and a small, cheap model into the team that does the work.

The small model writes the spec, the plan and the tests, writes the code, and runs its own reviewer. The frontier model writes a short intake, approves the plan, answers a few checkpoints with terse directives, and signs off on the result. Most of the time it's just waiting, which costs nothing.

The goal: most of the tokens go to the cheap model, while code quality stays at the level a frontier model would hold it to.

> Status: early. hstack currently runs on **Muse Code**: Muse Wonder as the frontier and Muse Spark as the small model. Other harnesses come later.

---

## Why

Frontier tokens cost about 100× more than small-model tokens. Earlier experiments with hstack showed where they go:
- **The frontier writing text is the expensive part:** specs, briefs and fixes.
- **Small-model coding is almost free:** in one run, six small-model workers wrote six modules for 8 cents.
- **Every step moved from the frontier to the small model cut cost without hurting quality.**

So hstack takes that to its end. The small model does everything it can, and the frontier only decides **why** and **what**, checks the **how**, and corrects course in as few tokens as possible.

## How it works

```
 you ──task──▶ frontier (senior engineer)
                 │  intake: why, acceptance criteria, constraints, risks   (~20 lines)
                 ▼
               Muse lead (small model)
                 │  explores, writes spec + plan + criteria→tests map
                 │  ──▶ checkpoint: plan ──▶ frontier: APPROVE / REVISE (≤10 lines)
                 │  builds: alone, or fans out to 1…N Muse sub-agents
                 │  tests first, implements, runs an independent reviewer sub-agent
                 │  ──▶ checkpoint: done ──▶ frontier: runs checks, spot-checks risks,
                 │                             APPROVE / REVISE
                 ▼
               merge into your tree ──▶ report
```

- **Event-driven:** while the lead works, a script blocks and wakes the frontier only when a checkpoint arrives. There's no polling, and waiting costs no tokens.
- **Worker count follows the task:** the lead decides whether to do it alone or fan out to 2 or 100 sub-agents, and the frontier approves that choice in the plan.
- **Isolated:** the lead works in its own git worktree. Nothing reaches your code until the frontier approves and the patch is applied.
- **Skilled small models:** the `hstack-practice` skill gives the small model the engineering habits it usually lacks: exact specs, state tables, test-first development, real-environment facts and security basics. The frontier doesn't have to repeat them in every message.

## Risks and how hstack handles them

| Risk | Mitigation |
|---|---|
| Muse's spec drifts from what the user meant | The frontier's intake states acceptance criteria up front, and plan review checks the spec against them |
| Muse's tests only confirm its own mistakes | An independent Muse reviewer adds tests aimed at breaking the code, and the frontier spot-checks tests against the criteria |
| Lots of checkpoints add up | Wake on events only, keep digests short, and frontier context stays small |
| Tasks too vague for a small model | The frontier stays involved longer: more plan iterations, still terse |

## The skills

| Skill | Used by | Role |
|---|---|---|
| [`hstack`](skills/hstack/SKILL.md) | frontier (e.g. Muse Wonder) | Senior engineer: intake, plan review, checkpoint directives, final review, token discipline |
| [`hstack-lead`](skills/hstack-lead/SKILL.md) | small model (e.g. Muse Spark) | Owns the task end to end: spec, plan, fan-out, tests, build, independent review, checkpoints |
| [`hstack-practice`](skills/hstack-practice/SKILL.md) | small model (e.g. Muse Spark) | Engineering practice: exact specs, state tables, tests, real environment, security, honest reporting |

## Install

```bash
git clone https://github.com/shellhaki/hstack ~/hstack
~/hstack/install.sh muse       # links all skills into ~/.config/muse/skills
```

Requirements: `git`, `bash`, Muse Code (`muse`), and macOS Terminal for the optional progress window.

## Use

In Muse Code, with Muse Wonder as the model:

> Use hstack to add email sign-in with likes and comments to this app.

The frontier writes the intake, starts the Muse lead, and waits. One progress window shows the lead's checkpoints and the files it's writing. You get a single report at the end.

### Scripts

| Script | Who runs it | What it does |
|---|---|---|
| `scripts/start.sh <repo> <orch> <name> <intake>` | frontier | Snapshot the repo into a worktree and start the Muse lead in the background |
| `scripts/wait.sh <worktree>` | frontier, in the background | Block until the lead posts a checkpoint (`EVENT <id> <file>`) or exits |
| `scripts/direct.sh <worktree> <id>` | frontier | Answer a checkpoint: `APPROVE`, `REVISE` or `ANSWER`, plus WHY / WHAT / HOW |
| `scripts/await.sh <id>` | lead | Block until the frontier answers |
| `scripts/progress.sh <worktree>` | you | Live view of checkpoints and files |
| `scripts/collect.sh`, `merge.sh`, `cleanup.sh` | frontier | Turn the worktree into a patch, apply it to your tree, clean up |

## Benchmarks

Every benchmark compares the same task done by the frontier alone against hstack. Both use exact token counts and are judged by a hidden acceptance suite that neither side sees. Results go in [`benchmarks/`](benchmarks/) whatever they show.

| Benchmark | Frontier alone | hstack | Hidden tests |
|---|---:|---:|---|
| [1: six engine modules](benchmarks/01-engine-modules/results.md) | $2.46 | **$1.59 (-35%)**: frontier $1.49 + small model $0.10 | 82/82 · 82/82 |

## Roadmap

- More harnesses as frontier and small model: Claude Code, Cursor and OpenCode, starting from Muse.
- In-harness orchestration: harnesses that run several models themselves direct their own small models.
- More worker skills, per stack and per domain.

## License

See [LICENSE](LICENSE).
