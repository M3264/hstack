# Explore the code before changing it

A strong engineer doesn't start by writing. They find how this codebase already solves similar
problems and copy that. Most review rejections come from code that works but ignores the
project's own patterns, or rebuilds a helper that already exists.

## Steps
1. **Read the project's instructions first:** `AGENTS.md`, `CLAUDE.md`, `README.md`,
   `CONTRIBUTING.md` and any doc the brief names. Note their rules about frameworks, versions,
   commands and style.
2. **Learn how to build and test:** read `package.json` scripts, `Makefile`, `go.mod`,
   `pyproject.toml` or similar. Write down the exact commands for the build, the tests (all, and one
   file), lint and typecheck.
3. **Record a baseline.** Run the tests once before changing anything. Write down the pass and fail
   counts and the names of tests that already fail. Without this, you can't tell later what you broke.
4. **Find where the change goes.** Search for the words in the brief (feature names, routes, table
   names, UI text): `grep -rn "<word>" --include=<type> .` Open the matches that look like the
   feature's home.
5. **Find the closest existing example.** That's another endpoint, component, migration, command or
   test of the same kind. It is your template: its file layout, naming, error handling, validation,
   logging and test style. Write its path down.
6. **Look for existing helpers before you write one.** Search for likely names (`format`, `parse`,
   `validate`, `client`, `useX`) in `lib/`, `utils/`, `helpers/`, `shared/` and similar folders.
7. **Find the callers.** For every function, type, route or table you will change, search for its
   uses. Each caller is something that can break.
8. **Stop** when you can fill in every field below. Exploration has no other end condition: don't
   read the whole repo.

## How to read cheaply
- Search before you open. Open a file only when a search points to it.
- In a large file, read the range around the match, not the whole file.
- Never assume a file's contents from its name. Open it.

## Write `.hstack/work/MAP.md`
```
COMMANDS: build: ...  test all: ...  test one: ...  lint: ...  typecheck: ...
BASELINE: <pass>/<total>; already failing: <names or none>
RULES FROM DOCS: <versions, conventions, don'ts>
WHERE: <files the change goes in>
TEMPLATE: <path of the closest existing example> — copy: <layout, naming, errors, tests>
HELPERS TO REUSE: <path: function> ...
CALLERS AT RISK: <symbol> → <files>
SURPRISES: <anything that contradicts the brief or your assumptions → check TASK.md again>
```
