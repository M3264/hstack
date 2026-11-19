WHY: Implement the six engine modules specified for this benchmark repo so a hidden acceptance suite can import them; correctness is defined by BENCH-SPEC.md.
WHAT (acceptance criteria, numbered, each testable):
  1. All requirements in BENCH-SPEC.md sections 1-6 are implemented exactly as written, including every example verbatim; see BENCH-SPEC.md for the normative spec (do not paraphrase it).
  2. Each module in BENCH-SPEC.md has thorough Vitest tests next to it at src/<name>.test.ts covering its examples and edge/error cases from BENCH-SPEC.md.
  3. `npx tsc --noEmit` passes.
  4. `npx vitest run` passes.
CONSTRAINTS: TypeScript strict, no `any`, no runtime dependencies; exported names/signatures must match BENCH-SPEC.md exactly; package.json, tsconfig.json and vitest.config.ts are off-limits.
RISKS I WILL REVIEW: spec-example fidelity (exact strings/errors/orderings in BENCH-SPEC.md), minimal-diff and DOM/dow semantics, hidden-suite import compatibility.
CHECKPOINTS: plan, done
