---
name: hstack-run
description: Part of the hstack collection. Sets up isolated git worktrees and launches one smaller worker agent per work package (visible terminal windows on macOS, tmux elsewhere, or headless) with a live progress view, then waits in the background until all finish. Use after hstack-plan has produced task files, or to restart workers cleanly.
---

# hstack-run

Scripts: `$HSTACK/scripts/` (see the `hstack` skill for how to find `$HSTACK`).

## 1. Set up worktrees

```bash
SETUP_CMD='npx next typegen' LINK_DIRS='node_modules' \
  "$HSTACK/scripts/setup.sh" <repo> <orch-dir> wp1-api wp2-ui wp3-integration
```

- Snapshots the working tree: HEAD plus uncommitted changes, with ignored files excluded. It never touches the real index or branch.
- Creates one worktree per name on branch `orch/<name>`.
- Symlinks `LINK_DIRS` into each worktree and runs `SETUP_CMD` there (use it to regenerate ignored build artifacts the code needs).
- Worker names must match the task file names (`<TASKS_DIR>/<name>.md`).

## 2. Launch and wait

```bash
DELAY=0 TASKS_DIR=specs/tasks "$HSTACK/scripts/run.sh" <orch-dir>
```

- Run this **in the background with a completion notification** if your harness supports it. It blocks until every worker exits, closes the progress view, and prints each worker's exit code and whether its report exists.
- **Never poll** from your own turns. If the user asks for progress, run `ONCE=1 "$HSTACK/scripts/progress.sh" <orch-dir>` once.
- If the user wants to watch or record, set `DELAY` (e.g. 60) and tell them before your turn ends.
- `AGENT_CMD` picks the worker, with `{prompt}` replaced by the task path:
  - default: `muse exec --prompt-file {prompt}`
  - examples: `claude -p "$(cat {prompt})"`, `codex exec "$(cat {prompt})"`
  - add flags such as `--reasoning-effort medium` for speed
- `MODE` picks how workers run. The default on macOS is `progress`: workers run headless, and one Terminal window shows the live progress of all of them. `windows` adds one window per worker (closing one kills that worker), and `tmux` and `headless` are the other options. Use `TIMEOUT_MIN` to cap the wait.

## Restarting cleanly

In `windows` mode, closing a worker's window kills that worker, so ask the user before closing anything. Closing the progress window never stops workers. To restart:
1. Stop the background wait job, then kill the worker processes.
2. Inside each worktree, run `git reset --hard && git clean -fd`. This keeps symlinks and ignored files.
3. Clear `<orch>/.status/*.exit` and `<orch>/logs/*.log`, removing each file by explicit path.
4. Re-copy any task files you edited, then launch again.

## Pitfalls

- In `windows` mode a worker's Terminal window can silently fail to open. The worker then never starts, and the wait hangs on it. `progress` mode, the default, avoids this. If it happens anyway, start the missing worker yourself with `nohup bash <orch>/.run/<name>.sh &`, and the running wait picks it up.

- Headless worker CLIs often print nothing until they finish. The progress view shows files being written instead.
- New terminals may print errors from the user's shell startup files. That noise is harmless, so tell the user so they don't worry.
- Muse marks fresh worktrees as untrusted, which disables `AGENTS.md` loading and its own sub-agents. Have the task files tell workers to read `AGENTS.md` explicitly. Pass `--trust-workspace` only if the user agrees.
- Transient network resets happen. Muse retries within a run, and `run.sh` re-runs a worker that still exits non-zero (`WORKER_RETRIES`, default 1). In benchmark 2 one worker failed after 13 minutes of stream errors, and the orchestrator had to write its module, which cost far more than a retry.
- `muse attach` (live attach) is off by default, so don't promise it.
- Your own harness may block broad `rm` globs. Remove files by explicit path.
