---
name: hstack-plan
description: Part of the hstack collection. The orchestrator turns a big task into a spec, frozen shared contracts and stubs, and one precise task file per worker agent so several smaller models can build it in parallel without colliding. Use before launching hstack workers, or whenever the user asks for a delegation plan or work-package split.
---

# hstack-plan

Templates: `$HSTACK/templates/` (see the `hstack` skill for how to find `$HSTACK`).

## 1. Write the spec

1. Read the codebase enough to know its patterns, helpers and conventions.
2. Check real runtime facts that mocks will hide, and write them into the spec. Examples: what types the database driver returns (e.g. timestamps as `Date`), which routes the framework prerenders, request header behavior.
3. Copy `templates/spec.md` into the repo (e.g. `specs/<feature>-spec.md`) and fill in:
   - goals and non-goals
   - data model, API contracts and UI contracts
   - numbered acceptance criteria (`AC-<pkg><n>`, plus global `AC-G*`)
   - the test plan
   - the work-package table with the paths each package owns
4. Show the plan to the user if they asked to see it first.

## 2. Freeze shared ground

Workers run in parallel and can't see each other, so set these up yourself before launch:
- **Contracts:** shared types file(s) with final names.
- **Stubs:** every module one package uses from another, with final exported signatures and trivial bodies, so each worktree compiles on its own.
- **Tooling:** test dependencies, test config and scripts. Workers must never touch dependency manifests or lockfiles.
- **Schema and migrations:** write them, and apply them only with the user's approval.
- **Secrets:** add new env vars to `.env` yourself. Workers get no `.env`.
- **Baseline check:** confirm the stubbed tree passes typecheck and that the test runner starts.

## 3. Write the task files

Put them in the repo (e.g. `specs/tasks/`) so the snapshot copies them into every worktree:
- `_common.md`, from `templates/_common.md`: shared rules covering:
  - lanes and forbidden files
  - no commits, no network, no real databases
  - test names prefixed with their acceptance-criterion id
  - definition of done and report format
- `<name>.md`, one per worker, from `templates/task.md`:
  - exact files to read
  - owned paths
  - what to build
  - which acceptance criteria to prove
  - report path `.orch/<name>.report.md`
- `<name>.owns` (optional): one glob per line of allowed paths. `collect.sh` flags anything else, and tests next to the code are always allowed.

## Keep briefs thin when the spec is already precise

Your output tokens are the most expensive thing in the whole run. If the spec already passes `templates/brief-checklist.md` (exact signatures, input-to-output examples, states), do **not** restate it per worker. A task file can be short:
- what it owns
- "implement section N of `<spec>`; every example there is a required test"
- the definition-of-done commands
- anything the spec leaves out

Restating a 900-word spec as 4,300 words of briefs is what made benchmark 1 cost more than doing the work directly. Write detail only where the spec is vague.

## Be specific: small models guess

A worker implements exactly what the brief says, and guesses at everything it doesn't say. Vague briefs ship plausible bugs. Before launch, run every task file through `templates/brief-checklist.md`. At minimum:
- **Examples, not intentions.** Give input and exact output for anything that leaves the app (URLs, emails, dates, files). Write "`/posts/abc` copies `https://site.dev/posts/abc`", not "copies the link".
- **A state table for every interactive element:** trigger, what the user sees, what a screen reader hears, duration and what comes next. Success and failure both need visible feedback, and failure must never say success.
- **When values are computed:** at click time, at render, or on the server.
- **Real environment facts** the worker can't discover through mocks.
- **One named test per state row and per example.**

If you catch yourself writing "handle", "properly", "nice UX" or "appropriate feedback", replace it with the concrete states and values.

## Prompting rules that matter

- Point to exact files and doc pages. "Read the docs" makes workers slow.
- Name the existing helpers to reuse.
- Tell workers to code against contracts and mock everything external.
- State framework rules they must follow, such as which routes must stay dynamic and how.
- Put the definition-of-done commands in the task, scoped to the package's own files where possible.
- Keep packages small enough to finish in one run. Six small packages beat three big ones.
