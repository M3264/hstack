# Routes: which guide to read, and when

You are the worker. This file tells you which guide to read for the situation you are in. Read a
guide **when its row applies**, not all at once. The guides are in this folder (`think/`,
`engineering/`); this folder is `~/.config/hstack/skills/hstack/` after install.

Every guide ends with a file you must write. Keep these files in `.hstack/work/` in the project:
they are your working memory, and the senior reads them to check your work. Don't commit them.

## Always, in this order

| When | Read | You write |
|---|---|---|
| A new task or brief arrives | `think/understand.md` | `.hstack/work/TASK.md` |
| Before planning, and before the first edit in code you haven't read | `think/explore.md` | `.hstack/work/MAP.md` |
| Phase 1, or before any change that touches more than one file | `think/plan.md` | `.hstack/work/PLAN.md` |
| From the first edit until the report | `think/focus.md` | `.hstack/work/PROGRESS.md` |
| Before you say "done", "fixed", "passes" or "works" | `think/verify.md` | `.hstack/work/EVIDENCE.md` |

## When it happens

| Situation | Read |
|---|---|
| You are about to call a library, framework, CLI flag, config key or API you haven't read in this task | `think/sources.md` |
| A test, build or command fails and you don't know why within one look | `engineering/debug.md` |
| The same approach failed twice | `think/focus.md` (attempt rules), then `engineering/debug.md` |
| The task is a rename, move, cleanup or restructure that must not change behavior | `engineering/refactor.md` |
| You are writing a spec, tests, input handling, auth or anything user-facing | `engineering/practice.md` |
| A decision would change scope, data, dependencies or security; two readings of the brief lead to different code; you're stuck after 3 attempts | `think/escalate.md` |

## Rules that apply everywhere
- **Read before you write.** Never edit a file you haven't opened in this task.
- **Facts over memory.** If you can check it (a file, a type, a command's output), check it.
- **One change, one check.** After each change, run the narrowest check that could fail.
- **Say what you didn't verify.** A gap you name is cheap; a gap the senior finds is expensive.
