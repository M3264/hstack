# <name>: <one-line scope>

Report file: `.orch/<name>.report.md`. First read `<tasks dir>/_common.md`, then `<spec path>` (sections ...).

## You own
- `<glob>` (replace the stubs here; keep every exported name and signature)
- tests next to them

Other packages are being built in parallel. You depend on them only through these existing stubs: `<import path>` exporting `<names>`. Import exactly like that and mock them in tests.

## Build
- `<file>`: what it does, edge cases, which helpers to reuse.
- ...

## Exact behavior (fill every row; see templates/brief-checklist.md)

Input to output examples:
- `<input>` gives `<exact output>`

States, one table per interactive element:
| State | Trigger | User sees (icon, text, color) | Screen reader hears | Lasts / then |
|---|---|---|---|---|
| idle | | | | |
| success | | | | |
| error | | | | |

Computed when: <render | click | server | client effect>. Must never run during render or prerender: <...>
Must not change: <layout, classes, behavior to preserve>

## Tests
One named test per example and per state row: `<ID>-1 ...`

## Acceptance criteria you must prove with tests
AC-X1 to AC-Xn, AC-G2, AC-G3.
