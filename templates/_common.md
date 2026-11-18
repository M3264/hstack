# Rules for every work package

You are one of several parallel agents. Each works in its own git worktree (your current directory). The orchestrator reviews and merges your work, so stay inside your lane.

## Read first
1. `AGENTS.md` / `CLAUDE.md` / `README.md` if present (project rules).
2. `<path to spec>`: the whole file. Source of truth for behavior, contracts and acceptance criteria (AC ids).
3. Existing patterns to reuse: <list exact files and helpers>.

## Hard rules
- Edit or create ONLY the paths listed under "You own" in your task file, plus your own tests next to the code. Everything else is read-only, including stubs owned by other packages.
- Do NOT change dependency manifests, lockfiles, test config, compiler config, schema files, shared contract files, or env files.
- Do NOT commit, push, start dev servers, run production builds, use the network, or connect to real databases or services. Mock them.
- No type-check suppressions or untyped escapes. Never log secrets, tokens or personal data.
- Match the existing code style.
- If you need something outside your lane, code against the documented contract and list the need under "Requests" in your report.

## Tests
- Test names start with the AC id, e.g. `it("AC-A3: ...")`. Every AC assigned to you is covered by at least one test that actually asserts it.

## Definition of done (run in your worktree until all are green)
```
<typecheck command>
<lint command, scoped to your files if possible>
<test command for your paths>
<coverage command for your logic files>   # target >= 85% lines
```

## Finish
Write `.orch/<name>.report.md`: summary, files created or changed, table mapping every AC to test names, deviations from the spec with reasons, requests for the orchestrator, and the results of the commands above. Then stop.
