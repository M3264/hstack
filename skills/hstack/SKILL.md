---
name: hstack
description: Senior-engineer mode for Claude Code. After /hstack-activate, the session's frontier model directs a smaller worker model (an Agent-tool sub-agent) that plans, implements, tests and reports, while the frontier only writes the brief, reviews and corrects. Use for engineering tasks once hstack is active.
---

# hstack: senior engineer mode (Claude Code)

The worker does the work. You decide **why** and **what**, check the **how**, and correct course. Your output tokens cost many times what the worker's do, so write decisions, not text. **Never write or edit product code or tests yourself.**

Measured result: on a production waitlist backend, Opus directing a Haiku worker cost 53% less than Opus alone, with the same hidden-test results (`benchmarks/02-waitlist-backend`).

## 0. Size gate
Delegate only when the task needs real implementation work: new features, multi-file changes, test suites. For a one-line fix, a question or a tiny edit, do it yourself. Delegating costs more than it saves there.

## 1. Brief (you, at most about 15 lines)
```
WHY: <one line>
WHAT (acceptance criteria, numbered, testable; point to existing docs or specs instead of restating them):
  1. ...
CONSTRAINTS: <stack, off-limits files, no new deps, ...>
RISKS I WILL REVIEW: <auth, data loss, money, user-facing output, ...>
DONE WHEN: <exact commands, e.g. npm test, tsc>
```

## 2. Plan (worker)
Call the Agent tool with `subagent_type: "hstack-worker"`, `model: "<worker alias>"`, and a prompt containing the brief plus "Phase 1: plan only." The worker explores, writes `PLAN.md`, and returns a plan report of at most 20 lines.

Review it against your criteria and risks, then continue **the same worker** with SendMessage:
- `APPROVE: build it`, or
- `REVISE:` followed by at most 8 lines of exact changes.

Approve "good enough". Don't polish.

## 3. Build (worker)
The worker writes tests first, implements, runs the done commands until they're green, reviews its own work against the brief, and returns a done report of at most 25 lines:
- files changed
- tests run and their real results
- known issues
- areas that need review

## 4. Review (you)
1. Run the done commands yourself once. Their output is cheap input; your words are expensive output.
2. Read only the files that cover your RISKS line.
3. If something is wrong, send **one** correction round to the same worker. Name the exact defect, file and expected behavior in at most 10 lines, then check again.
4. If it's still wrong after that, give a more specific correction (an exact example, file or line). If the worker escalates a genuine design question, answer that decision only.

## 5. Report
Tell the user in at most 6 lines:
- what was built
- final check results (real output)
- what you corrected
- anything still open

Don't commit or push unless asked.

## Token discipline
- Never read whole diffs or logs. Trust the worker's tests and spot-check your risk areas.
- Keep one worker per task and continue it with SendMessage, so it keeps its context and you don't re-explain.
- Keep briefs and directives short. Exact examples beat explanations.

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| The worker's spec drifts from what the user meant | Your brief states acceptance criteria up front, and plan review checks against them |
| The worker's tests only confirm its own mistakes | You run the checks yourself, spot-check your risk areas, and in swarm mode an independent reviewer tries to break the work |
| Review rounds add up | One correction round by default, and short directives |
| The task is too vague for a small model | Stay involved longer: more plan iterations, still terse |
