# muse-orchestrator

An agent skill that lets one coding agent (the orchestrator) split a big task into work packages, run a cheaper worker agent per package in parallel, then verify and merge the results.

- Workers: [Muse Code](https://muse.meta.com) by default (`muse exec`). Any CLI agent works via `AGENT_CMD`.
- Isolation: one git worktree per package, branched from a snapshot of your working tree (uncommitted work included).
- Visibility: one terminal window per worker plus a live progress window (macOS Terminal), tmux panes elsewhere, or headless.
- No polling: `run.sh` blocks until every worker is done, so the orchestrator runs it in the background and gets woken once.

## Install

The skill is a folder with `SKILL.md` (standard Agent Skills format), `scripts/` and `templates/`.

| Harness | Install |
|---|---|
| Claude Code | `git clone <repo> ~/.claude/skills/muse-orchestrator` (or `.claude/skills/` in a project) |
| Codex CLI | `git clone <repo> ~/.codex/skills/muse-orchestrator` |
| Muse Code | `git clone <repo> ~/.config/muse/skills/muse-orchestrator` |
| Anything else | Clone anywhere and tell the agent: "Follow `<path>/SKILL.md`." |

Then `chmod +x <path>/scripts/*.sh`.

Requirements: `git`, `bash`, the worker CLI on `PATH`. Optional: macOS Terminal (windows) or `tmux`.

## Usage

Ask your agent something like: "Use the muse orchestrator skill to build <feature>. Write the plan in specs first."

Scripts (all take the orchestration dir, e.g. `../myrepo-orch`):

```bash
scripts/setup.sh <repo> <orch> wp1-api wp2-ui   # snapshot + worktrees (+ LINK_DIRS, SETUP_CMD)
scripts/run.sh <orch>                           # launch, live progress, wait, close progress
scripts/progress.sh <orch>                      # live view on its own
scripts/collect.sh <orch>                       # patches, lane check (.owns), VERIFY_CMD per worker
scripts/merge.sh <orch>                         # apply patches to the main working tree
scripts/cleanup.sh <orch> --yes                 # remove worktrees and orch/* branches
```

Useful env vars: `AGENT_CMD`, `TASKS_DIR`, `MODE`, `DELAY`, `TIMEOUT_MIN`, `LINK_DIRS`, `SETUP_CMD`, `VERIFY_CMD`.

## When it saves money

Big, well-specified, parallel tasks with tests (roughly 500+ lines, disjoint files). The orchestrator writes instructions and reviews diffs instead of generating code. For small or tangled changes it costs more than doing the work directly.
