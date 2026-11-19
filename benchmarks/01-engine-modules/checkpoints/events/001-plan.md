KIND: plan
SUMMARY: Implement 6 engine modules via 6 parallel sub-agents, tests-first, integrate + review
DETAILS:
- Spec: BENCH-SPEC.md sections 1-6 normative (exact strings/errors/orderings); see .hstack/plan.md.
- Tests: 6 co-located suites src/<name>.test.ts, one named test per spec example + edge/error rows.
- Files: create src/markdown|cron|jsonpath|diff|template|expr .ts + .test.ts; nothing else.
- Fan-out: 6 agents (modules fully independent, separate files); I integrate + run gates + reviewer.
- Risks: fidelity via tests-first+reviewer; Myers/DOM-DOW via targeted cases; import-compat via exact exports, tsc, no deps/any.
- Done: npx tsc --noEmit and npx vitest run green.
ASK: approve
