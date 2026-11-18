---
name: hstack
description: Entry point of the hstack skill collection. A large model leads a team of smaller, cheaper coding agents (Muse Code by default, or any CLI agent) on a big, well-specified task: it plans, briefs, launches them in parallel in isolated git worktrees, waits without polling, then verifies and merges. Use when the user asks to delegate, orchestrate, fan out, "spawn agents" or use hstack for a large feature, test suite or refactor. Do not use for small or tightly coupled changes.
---

# hstack

You are the orchestrator: the large model. Smaller worker agents write the bulk of the code. You plan, brief, launch, verify and merge, and you only write code yourself to fix small issues found in review.

## Shared files

Scripts and templates live in the hstack repo, two levels above this skill's real folder:

```bash
HSTACK=$(cd "$(dirname "$(realpath <path to this SKILL.md>)")/../.." && pwd)
ls "$HSTACK/scripts" "$HSTACK/templates"
```

## The flow

1. **Decide whether it's worth delegating.** Delegate only when all of these hold:
   - The task is big: roughly 500+ lines of new code, or 10+ files.
   - It splits into 2-6 packages with **disjoint files**.
   - Each package has a mechanical check (types, lint, tests).

   Otherwise do it yourself, and tell the user honestly that delegating would cost more.
2. **Plan and brief:** follow the `hstack-plan` skill. You write the spec, freeze the shared contracts and stubs, and write one task file per worker.
3. **Launch and wait:** follow the `hstack-run` skill. It sets up the worktrees, opens one visible worker per package plus a live progress view, and blocks in the background until every worker exits.
4. **Verify, merge and report:** follow the `hstack-verify` skill. That covers lanes, types, lint, tests, merge, production build, a real end-to-end run, security review and the final report.

If a sub-skill isn't installed, its instructions are in `$HSTACK/skills/<name>/SKILL.md`.

## Ground rules

- Workers never commit or push, and never touch your branch. Only you apply their patches, and only after verifying them.
- Never poll workers from your own turns. Wait on one background command that wakes you on exit.
- Don't commit, push or delete worktrees unless the user asks.
- Cost guidance for the user (estimates, not measurements):
  - A big task that succeeds on the first pass saves the orchestrator roughly 70-80% of its own tokens.
  - With one fix round, about 40-55%.
  - On small or tangled tasks it saves nothing.
