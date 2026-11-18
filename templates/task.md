# <name>: <one-line scope>

Report file: `.orch/<name>.report.md`. First read `<tasks dir>/_common.md`, then `<spec path>` (sections ...).

## You own
- `<glob>` (replace the stubs here; keep every exported name and signature)
- tests next to them

Other packages are being built in parallel. You depend on them only through these existing stubs: `<import path>` exporting `<names>`. Import exactly like that and mock them in tests.

## Build
- `<file>`: what it does, edge cases, which helpers to reuse.
- ...

## Acceptance criteria you must prove with tests
AC-X1 to AC-Xn, AC-G2, AC-G3.
