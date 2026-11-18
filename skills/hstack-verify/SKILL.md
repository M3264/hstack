---
name: hstack-verify
description: Part of the hstack collection. The orchestrator verifies, merges and reports on work produced by smaller worker agents. It checks lanes, types, lint and tests per worker, merges the patches, then runs a production build, a real end-to-end test against actual services and a security review, because green mocked tests are not proof. Use after hstack-run finishes, or to review any delegated code before merging.
---

# hstack-verify

Scripts: `$HSTACK/scripts/` (see the `hstack` skill for how to find `$HSTACK`).

## 1. Per worker

1. Read `<worktree>/.orch/<name>.report.md` (deviations and requests first) and `<orch>/logs/<name>.log`.
2. Collect patches and check lanes:
   ```bash
   VERIFY_CMD='npx tsc --noEmit && npx eslint src && npx vitest run' \
     "$HSTACK/scripts/collect.sh" <orch-dir>
   ```
   This writes one patch per worker against the snapshot, flags edits outside `<name>.owns`, and runs `VERIFY_CMD` inside each worktree.
3. Read each patch yourself. Check:
   - correctness and contract compliance
   - security
   - that tests actually assert their acceptance criteria rather than just existing
4. Small issue: fix it in the worktree and re-collect. Large issue: write a short follow-up task and relaunch only that worker with `hstack-run`.

## 2. Integrate

1. `"$HSTACK/scripts/merge.sh" <orch-dir>` applies every patch to the main working tree. It stops at the first conflict.
2. In the main tree, run typecheck, lint, the full test suite and the **production build**.

## 3. Prove it for real (never skip)

Workers mock everything external, so their tests only prove the code matches their own assumptions. In the first real hstack run, 4 workers delivered about 8,600 lines and 300 passing tests, and all reported done. A real end-to-end run still found 5 bugs:
- **Driver types:** the code expected string timestamps, but the database driver returns `Date` objects. Every sign-in returned 500.
- **Runtime request shape:** body-less POSTs were rejected as "non-JSON".
- **Framework rendering:** new GET route handlers were prerendered at build time, which would have frozen a session endpoint into a static response.
- **Security ordering, twice:** refresh-token reuse detection ran before the secret check, so anyone who knew a session id could log its owner out. Rotation also wasn't atomic.

So always:
- Script an end-to-end run against real services. Use sandbox addresses (e.g. `delivered+x@resend.dev`), create test rows, and delete them afterwards.
- Take screenshots of new UI at desktop and phone widths.
- Review security-sensitive files line by line yourself: auth, tokens, permissions, input validation.
- Add a regression test for every bug you fix.
- When an error handler deliberately hides details, log the full error temporarily to debug, then restore the original.

## 4. Clean up and report

- `"$HSTACK/scripts/cleanup.sh" <orch-dir> --yes` removes the worktrees and `orch/*` branches. Ask the user first. Logs and patches are kept.
- Don't commit or push unless asked.
- Report to the user:
  - what each worker delivered
  - every check with its real result
  - bugs found and fixed, and what is still open or skipped
  - cost notes if they asked
  - next steps (e.g. env vars to set in hosting)
