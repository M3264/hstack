# hstack

**Big models plan. Small models build. Big models verify.**

hstack is a collection of agent skills that turns a frontier model into an engineering lead. Instead of writing every line itself, the large model writes the spec, splits the work, and directs a team of smaller, cheaper coding agents running in parallel. Then it checks their work against real tests and real services before anything is merged.

You get frontier-level judgment on the parts that need it (architecture, contracts, review, security) and small-model prices on the part that costs the most tokens: writing the code.

---

## Why

Today you usually pick one model per task, or route each request to a model based on how hard it looks. Routing helps with cost, but every request is still handled by one model on its own. Nothing plans the whole job, and nothing checks the cheap model's work.

hstack takes a different approach. The big model doesn't hand the task off; it **orchestrates** it:

| | One big model | Model routing | hstack |
|---|---|---|---|
| Who writes the code | Big model | Whichever model the router picks | Several small models in parallel |
| Who plans and splits the work | Big model, inline | Nobody | Big model, up front, as a written spec |
| Who checks the result | Big model, inline | Nobody | Big model, against tests and real services |
| Cost of the bulk work | Highest | Varies | Small-model prices |
| Parallelism | No | No | Yes, one agent per work package |

The expensive part of agentic coding is output tokens: generating code, re-reading files, iterating. hstack moves that to small models and keeps the big model on the high-leverage work: deciding what to build, defining exact contracts, and catching what the small models get wrong.

## How it works

```
                    ┌──────────────────────────────┐
                    │  Orchestrator (large model)  │
                    │  spec · contracts · stubs    │
                    └──────────────┬───────────────┘
                                   │ task files
        ┌──────────────┬───────────┴──┬──────────────┐
        ▼              ▼              ▼              ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ worker 1│    │ worker 2│    │ worker 3│    │ worker 4│   small models,
   │ worktree│    │ worktree│    │ worktree│    │ worktree│   isolated git worktrees
   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
        └──────────────┴──────┬───────┴──────────────┘
                              ▼ patches + reports
                    ┌──────────────────────────────┐
                    │  Orchestrator verifies       │
                    │  lanes · types · tests ·     │
                    │  build · real E2E · review   │
                    └──────────────┬───────────────┘
                                   ▼
                             merged, working code
```

1. **Plan.** The orchestrator writes a spec: goals, data model, API and UI contracts, numbered acceptance criteria, and a table of work packages, each owning its own files.
2. **Freeze shared ground.** Shared types, stub modules with final signatures, test tooling and schema are set up first, so every package compiles on its own and no two workers touch the same file.
3. **Brief.** One task file per worker: what to read, what it owns, what to build, which acceptance criteria to prove with tests, and what "done" means.
4. **Fan out.** Each worker runs headless in its own git worktree, branched from a snapshot of your working tree. On macOS one Terminal window shows live progress for all of them: files being written and the latest lines of each. Elsewhere it's tmux or headless.
5. **Wait without polling.** One background job blocks until every worker exits, then wakes the orchestrator once. Waiting costs zero tokens.
6. **Verify.** Per worker: did it stay in its files, does it type-check, lint and pass tests. Then the orchestrator merges everything and runs the full build plus a real end-to-end test against actual services.
7. **Fix and report.** Small problems are fixed directly, with regression tests. Big ones go back to a worker with a follow-up task.

## Why verification is the point

Small models are good at writing code against a clear brief. They are bad at knowing what they don't know. In the first real hstack run:

- **4 workers** built a full social layer (passwordless email sign-in, rotating refresh tokens, likes, comments, posts, UI and integration) in **about 20 minutes**.
- They produced **about 8,600 lines** and **300 passing tests**, and every worker reported "done".
- The orchestrator's end-to-end run against the real database still found **5 real bugs**:
  - Every sign-in failed, because the database driver returns dates in a format the workers' mocks didn't match.
  - Valid requests were rejected by an over-strict security check.
  - A login endpoint was being frozen at build time.
  - Two refresh-token security flaws.

None of these were visible to the workers' own test suites. That's the case for hstack: cheap models for volume, a strong model as the gate.

## Cost: measured, honestly

**[Benchmark 1](benchmarks/2026-11-18-utility-modules.md)** (four small, precisely specified utility modules, about 1,000 lines with tests):

| | Claude Opus alone | hstack (Opus + 4 Muse workers) |
|---|---:|---:|
| Cost | **$0.72** | $1.21 (Opus $1.17 + Muse $0.04) |
| Hidden acceptance tests | 33/33 | 33/33 |
| Wall time | 3 min | 9 min |

hstack **lost** this one. The Muse workers wrote all the code for **4 cents**, but the orchestrator spent more tokens re-writing an already precise spec into worker briefs than it would have spent writing the code itself. That led to two rule changes:
- a size gate: delegate only when the code is at least 5× the briefs
- thin briefs that point to the spec instead of restating it

hstack is built for large, well-specified, parallel work: big features, test suites, multi-file refactors. There, the code dwarfs the briefs. For small jobs the skills tell the orchestrator to just do the work. Benchmark 2, on a larger task with the updated skills, is next, and every benchmark goes in [`benchmarks/`](benchmarks/) with its harness, whatever the result.

## Supported pairs

| Orchestrator (large model) | Workers (small models) | Status |
|---|---|---|
| Claude Code | Muse Code (`muse exec`) | Working (the run described above) |
| Any skill-aware agent | Any CLI agent via `AGENT_CMD` | Works, less tested |

Roadmap:

- First-class worker and orchestrator support for **Muse Code, Claude Code, Cursor and OpenCode**, in any combination.
- **In-harness orchestration.** In harnesses that can run several models themselves, the large model will spawn and direct the smaller ones directly, with no external CLI.
- Measured per-run cost reports, comparing the orchestrator's and workers' token use with a single-model baseline.

## The skills

| Skill | Role |
|---|---|
| [`hstack`](skills/hstack/SKILL.md) | Entry point. Decides whether delegation is worth it and runs the whole flow through the skills below. |
| [`hstack-plan`](skills/hstack-plan/SKILL.md) | Spec, frozen contracts and stubs, and one precise task file per worker. |
| [`hstack-run`](skills/hstack-run/SKILL.md) | Isolated worktrees, one visible worker per package, live progress, a background wait with no polling, clean restarts. |
| [`hstack-verify`](skills/hstack-verify/SKILL.md) | Lane checks, per-worker checks, merge, production build, real end-to-end test, security review, report. |

Each skill works on its own (for example, `hstack-verify` can review any delegated code), and together they form the full loop. Shared `scripts/` and `templates/` live at the repo root.

## Install

Clone once, then link every skill into your harness:

```bash
git clone https://github.com/shellhaki/hstack ~/hstack
cd ~/hstack

./install.sh claude     # ~/.claude/skills
./install.sh codex      # ~/.codex/skills
./install.sh muse       # ~/.config/muse/skills
./install.sh <dir>      # any other harness's skills folder
```

The skills are symlinks, so `git -C ~/hstack pull` updates all of them. For a harness without a skills folder, tell the agent to "follow `~/hstack/skills/hstack/SKILL.md`".

**Requirements:** `git`, `bash`, and the worker CLI on your `PATH` (`muse` by default). Optional: macOS Terminal for visible windows, or `tmux`.

## Use

Ask your orchestrator in plain language:

> Use hstack to build email sign-in with likes and comments. Write the plan in `specs/` first, then orchestrate Muse workers and verify everything before merging.

The `hstack` skill walks the orchestrator through `hstack-plan`, `hstack-run` and `hstack-verify`. You'll see one window per worker and a live progress view, and get one final report.

### Scripts

All of them take an orchestration directory, for example `../myrepo-orch`.

| Script | What it does |
|---|---|
| `scripts/setup.sh <repo> <orch> <name>...` | Snapshot the working tree (uncommitted work included, ignored files excluded) and create one worktree per worker |
| `scripts/run.sh <orch>` | Launch every worker, open the live progress view, wait, close it, print results |
| `scripts/progress.sh <orch>` | Live view of the files each worker is writing |
| `scripts/collect.sh <orch>` | One patch per worker, check each stayed in its files, optionally run checks in each worktree |
| `scripts/merge.sh <orch>` | Apply all patches to your main working tree (stops on conflict) |
| `scripts/cleanup.sh <orch> --yes` | Remove worktrees and `orch/*` branches (logs and patches are kept) |

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `AGENT_CMD` | `muse exec --prompt-file {prompt}` | Worker command; `{prompt}` becomes the task file path |
| `TASKS_DIR` | `specs/tasks` | Where task files live inside the repo |
| `MODE` | `progress` on macOS | `progress` (headless workers, one progress window), `windows`, `tmux` or `headless` |
| `DELAY` | `0` | Seconds to wait before launching (handy for screen recording) |
| `TIMEOUT_MIN` | `120` | Give up waiting after this long |
| `LINK_DIRS` | `node_modules` | Ignored directories to symlink into each worktree |
| `SETUP_CMD` | none | Command run in each new worktree (e.g. `npx next typegen`) |
| `VERIFY_CMD` | none | Checks run in each worktree by `collect.sh` |

### Templates

`templates/spec.md`, `templates/_common.md` (rules every worker follows), `templates/task.md` (one per worker, with input-to-output examples and a state table) and `templates/brief-checklist.md`, the specificity checklist every brief must pass, because small models guess at whatever a brief leaves out. Add a `<name>.owns` file with one glob per line to have `collect.sh` flag edits outside a worker's files.

## Safety

- Workers never commit, push, or touch your real branch. They only change their own worktree.
- Nothing reaches your code until the orchestrator has verified it and applied the patches.
- Workers are told not to use the network, real databases or secrets. Real-service tests are run only by the orchestrator, with sandbox addresses and cleanup.
- `cleanup.sh` refuses to delete anything without `--yes`.

## License

Not chosen yet.
