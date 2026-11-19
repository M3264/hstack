---
name: hstack
description: For the frontier model. Act as the senior engineer over a Muse Code lead (a small, cheap model) that writes the spec, plan, tests and code for a task. You write a short intake, approve or correct its plan, answer checkpoints with terse directives, and give final approval, spending as few tokens as possible while keeping quality high. Use when the user asks to use hstack, delegate to Muse, or have a smaller model do the work under your supervision.
---

# hstack: senior engineer mode

The small model does the work. You decide **why** and **what**, check the **how**, and correct course. Every token you write costs about 100× what the small model's tokens cost, so write decisions, not text.

`$HSTACK` is two levels above this skill's real folder: `HSTACK=$(cd "$(dirname "$(realpath <this SKILL.md>)")/../.." && pwd)`.

## 1. Intake (you write at most about 20 lines)

Write the intake to a scratch file:

```
WHY: <one line: the problem and who it's for>
WHAT (acceptance criteria, numbered, each testable):
  1. <criterion, with an exact example wherever an output matters: input -> output>
  2. ...
CONSTRAINTS: <stack, files or areas off-limits, no new deps, perf or security limits>
RISKS I WILL REVIEW: <e.g. auth, data loss, anything user-facing or leaving the app>
CHECKPOINTS: plan, done   (add others only if the task is risky)
```

Don't design the solution, write the spec, or split the work. The lead does all of that.

## 2. Start and wait

```bash
WT=$("$HSTACK/scripts/start.sh" <repo> <orch-dir> <task-name> <intake.md>)
"$HSTACK/scripts/wait.sh" "$WT"      # run in the background with a completion notification
```

- `start.sh` creates an isolated worktree, starts the Muse lead headless (with its own sub-agents enabled), and opens one progress window.
- **Never poll.** `wait.sh` blocks for free and wakes you with `EVENT <id> <file>` or `EXITED <code>`.

## 3. Answer checkpoints

Read **only the event file**. Open a specific file only if the event points to it and your decision depends on it.

Answer with:

```bash
"$HSTACK/scripts/direct.sh" "$WT" <id> "APPROVE"
# or
"$HSTACK/scripts/direct.sh" "$WT" <id> <<'D'
REVISE
WHY: <one line>
WHAT: <what must change>
HOW: <only if the lead can't work it out>
D
```

Then run `wait.sh` again in the background.

**Plan review** is the most valuable checkpoint, so take it seriously. Check:
- every acceptance criterion maps to a test
- scope matches the intake
- the fan-out (1 to N sub-agents) fits the task
- the risky areas have explicit handling
- no guessed facts about the real environment

Approve if it's good enough. Don't polish it.

**Questions or blocked events:** give a decision, not a discussion.

**Done event:**
1. Run the definition-of-done commands yourself once. Tool output is cheap input; your words are expensive output.
2. Review only the files in your RISKS line (`git -C "$WT" diff <snapshot> -- <paths>`).
3. Answer APPROVE, or REVISE with the exact defects.

## 4. Finish

After you approve `done` and the lead exits:
- `"$HSTACK/scripts/collect.sh" <orch-dir>` then `"$HSTACK/scripts/merge.sh" <orch-dir>`.
- Run the project's full checks in the main tree.
- Report to the user: what was built, the checks with their real results, what you corrected, and anything still open.
- Ask before running `cleanup.sh <orch-dir> --yes`.
- Don't commit or push unless asked.

## Token discipline

- Your output per directive is at most about 10 lines. Your intake is at most about 20 lines.
- Never read whole diffs, logs or every file. Trust the lead's gates and spot-check your RISKS.
- Never write product code yourself. If something is wrong, REVISE with the defect, and the lead fixes it.
- If the lead goes wrong twice on the same point, be more specific (an exact example, file or line). Don't take over.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Muse's spec drifts from what the user meant | Your intake states acceptance criteria up front, and plan review checks the spec against them |
| Muse's tests only confirm its own mistakes | The lead runs an independent reviewer sub-agent that adds tests aimed at breaking the code, and you spot-check tests against the criteria |
| Lots of checkpoints add up | Wake on events only, keep events and directives short, keep your context small |
| Tasks too vague for a small model | Stay involved longer: more plan iterations, still terse |
