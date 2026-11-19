# Plan — six engine modules (BENCH-SPEC.md normative)

## Spec
Normative spec is BENCH-SPEC.md §§1–6, examples hold character-for-character.
Do not paraphrase; key exact behaviors:
- markdown: blocks joined `\n`; heading/para/fenced-code/blockquote/list/rule per §1; inline `**`/`*`/`_`/code/link/escapes; `&<>"` escapes; `javascript:` link guard.
- cron: 5 fields, syntax `* a a-b */n a-b/n` + lists; sorted unique arrays, dow 7→0; `Invalid cron expression` errors; `nextRun` UTC minute-resolution strictly-after, DOM/DOW OR-vs-AND rule, 5y limit `No run within 5 years`.
- jsonpath: `$ .key ['key'] ["key"] [n] [*] .* ..key [s:e] [?(EXPR)]`; filter ops/parens/`&&`>`||`/bare-exists/missing=false; doc order, missing→`[]`; error `Invalid JSONPath at <i>`.
- diff: split `\n` (trailing `\n` no extra line, `""`=0 lines); Myers minimal, deletes-before-inserts; `unifiedDiff` defaults context=3 fromFile=a toFile=b, `""` if equal, `---/+++/@@ -L,S +L,S @@` hunks, merge gap `<2*context`, trailing `\n` each line.
- template: mustache subset `{{}}` escaped / `{{{}}}`+`{{&}}` raw / dotted / `{{.}}` / `{{!}}` / `{{>}}`; stack lookup, missing→`""`, `String(n)`; `#`/`^` sections incl. list/object/falsy rules; `Unclosed section: k`.
- expr: numbers incl. `1.5e2`; ops `+- */% ^`, prec `+- < */% < unary < ^`, `^` right-assoc; parens; vars+`pi`/`e`; `min/max/abs/round/floor/ceil/sqrt`; exact error strings with positions.

## Criteria to tests
1. §§1–6 exact incl. verbatim examples → `src/<name>.test.ts` per-module test proving each spec example + edge/error cases (markdown/cron/jsonpath/diff/template/expr suites).
2. Thorough co-located Vitest tests → same files, ≥1 named test per spec example + error/edge rows.
3. `npx tsc --noEmit` passes → strict, no `any`, exact export names/signatures.
4. `npx vitest run` passes → all suites green.

## Files
Create: `src/markdown.ts`, `src/cron.ts`, `src/jsonpath.ts`, `src/diff.ts`, `src/template.ts`, `src/expr.ts`
plus `src/<name>.test.ts` × 6. Touch nothing else (package.json/tsconfig/vitest.config off-limits).

## Fan-out
6 sub-agents, one module+tests each — parts are fully independent (no shared code, separate files, normative examples per section). Each gets: owned 2 files, its BENCH-SPEC section verbatim refs, done commands (`npx tsc --noEmit`, `npx vitest run src/<name>.test.ts`). I integrate, run full gates, and run reviewer agent myself. (Alternative — all myself — rejected: 6 exact-spec modules in one context risks cross-contamination and fidelity slips.)

## Risks (intake RISKS line)
- Spec-example fidelity → tests-first from verbatim examples; reviewer adversarial tests on exact strings/errors/orderings.
- Minimal-diff + DOM/DOW semantics → Myers minimality + hunk-merge rule tested; cron DOM/DOW OR-vs-AND + `*/15`/MON-FRI/leap-day cases tested.
- Hidden-suite import compat → exact export names/signatures, no runtime deps, strict no-`any`; verified by tsc + direct import smoke.

## Definition of done
`npx tsc --noEmit` → exit 0. `npx vitest run` → all pass. Both run by me after integration + after reviewer fixes.
