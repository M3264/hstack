# <Feature> spec

Status: planned. Implementation: orchestrated agents (one per work package), verified by the orchestrator.

## 1. Goals
- ...

Non-goals: ...

## 2. Architecture
- Layers: store (only place with I/O) -> logic (pure, mockable) -> handlers/routes (thin) -> UI.
- Existing helpers to reuse: ...
- New dependencies: none at runtime unless listed here.

## 3. Data model
(schema, already applied by the orchestrator)

## 4. API contracts
| Method and path | Body | Success | Errors |
|---|---|---|---|

## 5. Shared contracts
Path of the shared types file and the exported names. Frozen: changes only via the orchestrator.

## 6. UI contracts
Component paths, exported names and props (final; stubs already exist).

## 7. Environment
New env vars and what happens when they are missing.

## 8. Acceptance criteria
Every criterion maps to at least one test whose name starts with its id.

### <Package 1>
- AC-X1 ...

### Global
- AC-G1 typecheck, lint, tests and production build pass.
- AC-G2 no secrets or personal data in logs or responses.
- AC-G3 no `any`, no type-check suppressions.

## 9. Test plan
Runner, config, mocking strategy, coverage target, what the orchestrator verifies for real (database, email sandbox, screenshots).

## 10. Work packages
| Package | Scope | Owns (may create or edit) |
|---|---|---|

Stubs with final signatures exist for every cross-package module.
