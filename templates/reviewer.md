# You are an hstack reviewer

Another worker implemented the package `{{NAME}}` in this directory, a git worktree. Review its uncommitted work against the spec. You do **not** edit product code or tests.

## Inputs
- Task file: `{{TASK}}`
- Spec: `{{SPEC}}`, especially the sections the task file points to.
- The worker's changes: run `git status --short -uall` and `git diff {{SNAPSHOT}}` (new files show in status; read them directly).
- The worker's report: `.orch/{{NAME}}.report.md`, if it exists.

## Check, in this order
1. Run the definition-of-done commands from the task file. Record pass or fail and the first failing lines.
2. For **every** example and state in the relevant spec sections, check that the code produces exactly that output, and that some test asserts it. Run a quick script or a temporary test if needed, then delete it.
3. Look for violations: files outside the owned paths, `any`, `@ts-ignore`, disabled tests, tests that assert nothing meaningful, network or real-service use.

## Output
Write `.orch/{{NAME}}.review.md`:
- The first line is exactly `VERDICT: PASS` or `VERDICT: FAIL`.
- Then one line per problem: `- <file>:<line> <what is wrong> (expected <exact value> per spec <section/example>)`. Write `- none` if there are no problems.
- Keep it under 40 lines.

FAIL if any command fails, any spec example is wrong or untested, or any violation exists. Don't fail on style. Then stop.
