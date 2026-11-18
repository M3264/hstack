---
name: hstack
description: hstack lets a large model orchestrate smaller, cheaper coding agents (Muse Code by default, or any CLI agent) working in parallel on a big, well-specified task. The orchestrating agent writes the spec, contracts and task files, launches one agent per work package in isolated git worktrees (visible terminal windows on macOS, tmux elsewhere), waits without polling, then verifies, merges and reports. Use when the user asks to delegate, orchestrate, fan out or "spawn agents" for a large feature, test suite or refactor. Do not use for small or tightly coupled changes.
---

# hstack

You (the orchestrator) plan, split, launch, wait, verify and merge. Worker agents write the code. You never write the bulk of the code yourself; you only fix small issues found in review.

## 1. Decide if it is worth it

Delegate only when all of these hold:
- The task is big (roughly 500+ lines of new code or 10+ files).
- It splits into 2-6 packages with **disjoint files**.
- Each package has a mechanical check (types, lint, tests) that proves it works.

Otherwise do it yourself: for small or tangled changes, writing instructions plus reviewing costs more than doing the work. Tell the user this honestly if they ask about savings. Typical saving for the orchestrator on a big task that succeeds first time: roughly 70-80% of its own tokens; about 40-55% with one fix round; none if you must redo it.

## 2. Plan (you, before launching anything)

1. Read the codebase enough to know its patterns.
2. Write a spec from `templates/spec.md` into the repo (e.g. `specs/<feature>-spec.md`): goals, non-goals, data model, API contracts, UI contracts, numbered acceptance criteria (`AC-<pkg><n>`), test plan, work-package table with owned paths.
3. Show the plan to the user if they asked for one. Otherwise continue.

## 3. Prepare shared ground (you)

Workers run in parallel and cannot see each other's work, so freeze everything they share before launch:
- **Contracts**: shared types file(s) with final names.
- **Stubs**: every module one package consumes from another, with the final exported signatures and trivial bodies, so each worktree compiles on its own.
- **Tooling**: install test dependencies, test config, scripts in `package.json`. Workers must never touch `package.json` or lockfiles (merge conflicts).
- **Schema / migrations**: write and apply them yourself if the user approves database changes.
- **Secrets**: add any new env var to `.env` yourself; workers get no `.env`.
- Verify the stubbed tree passes typecheck and the test runner before launch.

## 4. Write task files (you)

Put them in the repo (they are copied into each worktree by the snapshot), e.g. `specs/tasks/`:
- `_common.md` from `templates/_common.md`: shared rules (lanes, forbidden files, no commits, no network, no real DB, test naming by AC id, definition of done, report format).
- One `<name>.md` per package from `templates/task.md`: what to read, what it owns, what to build, which ACs to prove, report path `.orch/<name>.report.md`.
- Optional `<name>.owns`: one glob per line of the paths the package may change. `collect.sh` flags anything outside it.

Prompting rules that matter:
- Point to the exact files and docs to read. "Read the docs" makes workers slow.
- Name the existing helpers and patterns to reuse.
- Tell them to code against contracts and mock everything external.
- Put commands for the definition of done in the task, scoped to the package's own files where possible.

## 5. Launch

```bash
SKILL=<path to this skill>
# 1) snapshot the working tree (uncommitted work included, .gitignored files excluded) and create one worktree per package
SETUP_CMD='npx next typegen' LINK_DIRS='node_modules' \
  $SKILL/scripts/setup.sh <repo> <orch-dir> wp1-auth wp2-api wp3-ui
# 2) launch every agent (windows on macOS, tmux elsewhere), open the progress view, wait, close it, print results
DELAY=0 TASKS_DIR=specs/tasks $SKILL/scripts/run.sh <orch-dir>
```

- Run step 2 **in the background with completion notification** if your harness supports it (e.g. a background shell that wakes you on exit). Never poll in a loop from your own turns; polling costs tokens every time.
- If the user wants to record or watch, give them a `DELAY` (e.g. 60) and tell them before the turn ends.
- `AGENT_CMD` picks the worker CLI. Default: `muse exec --prompt-file {prompt}`. Examples: `claude -p "$(cat {prompt})"`, `codex exec "$(cat {prompt})"`. Add flags such as `--reasoning-effort medium` for speed.
- `MODE=terminal|tmux|headless` overrides the auto choice.

## 6. Verify (you, after the completion notification)

For each package:
1. Read `.orch/<name>.report.md` and the log `<orch>/logs/<name>.log`.
2. `scripts/collect.sh <orch-dir>`: builds one patch per package from the snapshot, lists changed files, flags lane violations (`.owns`), and runs `VERIFY_CMD` inside each worktree if set (e.g. `VERIFY_CMD='npx tsc --noEmit && npm run lint && npx vitest run'`).
3. Review the patch yourself: correctness, security, contract compliance, tests actually asserting the ACs (not just existing).
4. Small issues: fix them in the worktree yourself. Large issues: write a short follow-up task file and relaunch only that package.

Then integrate:
5. `scripts/merge.sh <orch-dir>` applies all patches to the main working tree (stops on the first conflict).
6. Run the full checks in the main tree (typecheck, lint, all tests, production build) and any real-environment smoke tests (database, email sandbox, screenshots). Clean up any test data you create.
7. `scripts/cleanup.sh <orch-dir> --yes` removes the worktrees and `orch/*` branches. Ask the user first; logs and patches stay in `<orch-dir>`.

Do not commit or push unless the user asks.

## 7. Report

Tell the user: what each package delivered, checks run and their results, anything that failed or was skipped, what you fixed yourself, cost notes if they asked, and next steps.

## Green worker tests are not proof

Workers mock everything external, so their tests only prove the code matches their own assumptions. In the first real run (4 workers, about 8,600 lines, 300 passing tests, every package "done"), the orchestrator's real-environment smoke test still found:
- **Wrong driver assumptions**: the store mapped timestamps as strings; the real database driver returns `Date` objects, so every sign-in returned 500. Fix: check real driver return types before launch and put them in the spec ("timestamptz comes back as Date").
- **Over-strict request checks** that only failed against the real runtime (body-less POSTs rejected as "non-JSON").
- **Framework rendering rules**: new GET route handlers were being prerendered at build time, which would have frozen `/api/auth/me` as a static response. Fix: tell workers which routes must be dynamic and how (`await connection()` in this Next.js version).
- **Security ordering**: refresh-token reuse detection ran before the secret check, letting anyone who knew a session id log its owner out; rotation was not atomic. Review auth code line by line yourself.

So always finish with: production build, a scripted end-to-end run against real services (with a sandbox inbox such as `delivered+x@resend.dev` and test rows you delete afterwards), screenshots, then a focused review of security-sensitive files. Add a regression test for every bug you fix.

## Pitfalls seen in practice

- **Closing a worker's terminal kills the worker.** Confirm before closing windows; to restart clean, kill the processes, `git reset --hard && git clean -fd` inside each worktree, clear `<orch>/.status` and `<orch>/logs`, then relaunch.
- **Headless runs are silent until the end.** Use `scripts/progress.sh` (opened automatically by `run.sh`) to show files being written.
- **Generated, git-ignored files are missing in worktrees** (e.g. Next.js route types). Use `SETUP_CMD` to regenerate them and tell workers to rerun it after adding routes.
- **`node_modules` is git-ignored**; `setup.sh` symlinks it so workers need no install.
- **Untrusted workspace** in Muse: project rules (`AGENTS.md`) and its own sub-agents are disabled. Tell workers in the task to read `AGENTS.md` explicitly; pass `--trust-workspace` only if the user agrees.
- **Shell startup noise** in new terminals (errors from the user's `.zshrc`) is harmless; tell the user so they do not panic.
- **Transient network resets** happen; Muse retries by itself.
- **Your own harness may block broad `rm` globs**; remove files by explicit path.
- **Live attach** (`muse attach`) is off by default, so do not promise it.
