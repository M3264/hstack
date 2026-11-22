# PLAN: landing redesign — interactive demos, type discipline, richer hero (same design system)

Scope: `web/` only (Next 16.4.6, React 19, Tailwind 4, `src/` layout, OpenNext/Cloudflare).
Do not touch: install route, `site.ts` facts, GitHub/benchmark/history links. No commit/push, no deploy.

## 0. Registry investigation result (done in planning)

- `components.json`: absent (repo root and `web/`). `web/src/components/`: 6 hand-built files
  (`copy-button, cost-meters, face, hero-float, nav, product-window`), no `ui/` dir.
  No `@/components/ui` imports, no `shadcn` in `package.json`. `npx` registry install not run
  (plan-only phase; network install is build-phase work).
- Conclusion: no shadcn setup in `web/`. Lightest path: `npx shadcn@latest init` in `web/`
  (React + Tailwind 4), apply DESIGN.md theme tokens to created CSS vars, then
  `npx shadcn@latest add @shadcn/tabs @shadcn/toggle-group @shadcn/card @shadcn/progress`
  (exact list confirmed at build after `search`/`view`). Blocks first per `guides/components.md`.
- QUESTION for frontier: approve running `shadcn init + add` (new `components.json`, `web/src/components/ui/`,
  extra deps e.g. `@radix-ui/*`, `class-variance-authority`, `tailwind-merge`) inside `web/`? Alternative:
  hand-build demos from installed primitives only (recorded in DESIGN.md). Default: init.

## 1. Spec decisions (exact examples)

### 1a. DESIGN.md updates (criterion 1) — file: `.hstack/ui/DESIGN.md`
- Palette/fonts/scales unchanged (black `#0C0C0C` + metallic steel-blue gradient
  `linear-gradient(90deg,#D7E7FA,#8AB4E8,#5B8AC4)`; Geist display/text/mono scale as-is).
  NOTE: `web/src/app/layout.tsx` loads Inter + JetBrains Mono, not Geist — build aligns
  code to DESIGN.md (Geist via `next/font/google`) or records the deviation. QUESTION below.
- Type discipline section (new wording): mono ONLY for install commands, terminal transcript,
  skill names as typed identifiers (e.g. `hstack-activate`), inline code, and table/data numbers
  (tabular-nums OK in text face where the design prefers it). Everything else — eyebrows,
  skill/harness tags, step labels, status/helper text — sentence-case text face, muted color.
- No numbered eyebrows/kickers: at most one eyebrow per page, sentence case, only when it adds
  info the heading lacks. Example: `Benchmark 2 · production waitlist backend · Claude Code`
  (text face, muted, no uppercase tracking) instead of current `.eyebrow` mono-uppercase line.
- Show-don't-tell section: names registry parts per demo (tabs for walkthrough + benchmark
  comparison; toggle-group for harnesses; card + progress for skill mini-demos), richness moves
  newly allowed: layered product preview in hero, metallic primary CTA, flow image folded into
  walkthrough preview (single source, not duplicated). Motion stays Motion + GSAP with
  `prefers-reduced-motion` final-state fallback (already in DESIGN.md).
- Copy-tells: check every heading against `vendor/taste-skill/copy-tells.md` at build.

### 1b. How walkthrough (criterion 2) — files: new `how-walkthrough.tsx`, edit `product-window.tsx`, `page.tsx`
- Replace 3 static step tiles + separate flow-image tile with ONE walkthrough:
  `Tabs` (Brief | Plan | Build | Review) driving a single product preview built on `product-window.tsx`.
  Flow image `/hstack-flow.png` shown only inside the relevant tab (e.g. Plan tab side note),
  never as a standalone static box.
- State table (React state, sample content only, no backend):
  | state | trigger | user sees | SR hears | next |
  | idle-Brief | page load | Brief tab active, frontier brief bubble highlighted in preview | "Step 1 of 4: Brief" | click tab |
  | step-N | tab/stepper click | preview highlights that checkpoint (brief/plan/diff/review quote) | "Step N of 4: <name>" | click |
  | reduced-motion | media query | all steps visible, no animation | same | — |
- Exact example: clicking "Review" tab shows frontier correction bubble
  ("Re-signup with a pending email replaces the unsubscribe token…") highlighted; other bubbles dimmed.
  Steps: Brief (frontier intake), Plan (worker PLAN.md + ASK), Build (199 tests, `tsc` clean),
  Review (1 correction → regression test → APPROVE). Copy from `product-window.tsx` thread verbatim.

### 1c. Working demos (criterion 3) — files: new `benchmark-compare.tsx`, `skill-demos.tsx`, `harness-picker.tsx`; edit `cost-meters.tsx`, `page.tsx`
- Benchmark: keep `CostMeters` numbers EXACTLY (`site.ts` + `results.md`: solo $1.59, frontier $0.46,
  worker $0.30, total $0.75, −53%, 20/20, output tokens 39,806 vs 4,047/106,081, wall 5.5 vs 7.9 min).
  Add interactive comparison tabs: [Cost | Tokens | Time] switching the same bars/units;
  toggle "frontier alone vs hstack" replay stays. No new numbers. Tab labels sentence case.
- Skills (4 cards → 4 working miniatures, each with idle/success/error visible states):
  - `hstack-activate`: worker-name input + Validate button. Example: type `haiku 5.5` → success
    "Valid worker model — hstack active"; empty input → error "Name a worker model"; nonsense → error.
    Validation rule: non-empty, smaller-model name (accept list documented in plan; never invented claims).
  - `hstack`: brief checklist demo — 5 checkboxes (why, criteria, constraints, risks, done commands);
    Approve button disabled until all checked → enabled shows "Brief ready — ASK: approve".
  - `hstack-swarm`: 3 parallel lane progress bars (static sample percents from benchmark narrative,
    labelled sample) animating once on view; reduced-motion shows final state.
  - `hstack-practice`: spec/example toggle — before/after of one exact example
    (`/posts/abc` → full URL copy), plus state-row checklist.
- Harnesses: selectable row (`toggle-group`/`radio-group`): Claude Code (live: "Uses your existing
  login · No API keys · /hstack-activate"), Codex CLI / OpenCode / Cursor (disabled, "Coming soon").
  Selecting live harness shows its 3 proof points; selecting a coming-soon one shows "Not yet —
  hstack runs in Claude Code today." No invented logos/statuses.
- Failure visibility: every demo has an error/empty state (practice §States); failure never reports success.

### 1d. Mono/uppercase audit (criterion 4) — files: `globals.css`, `page.tsx`, `cost-meters.tsx`, `nav.tsx`
- `.eyebrow` class: change to text face, sentence case, no letterspacing (keep class name or rename
  to `.kicker`; update the one usage). Exact: `Benchmark 2 · production waitlist backend · Claude Code`.
- Step labels `step 1` mono → "Step 1" text face muted. Skill `for:` tags mono pills → sentence-case
  text-face badges ("Frontier", "Worker"). Harness tags: live `/hstack-activate` stays mono
  (typed identifier); "coming soon" → text face "Coming soon". Cost-meters header
  `COST TO BUILD…` uppercase mono → sentence-case text face ("Cost to build the same task");
  bar values: real data numbers — keep tabular-nums, font per DESIGN.md decision (text face semibold).
- Install commands, terminal transcript, inline `<code>` stay mono. Hero-float marks `20/20`, `−53%`,
  `$0.75` are data → text-face semibold or keep mono per DESIGN.md call (record choice).

### 1e. Hero (criterion 5) — files: `page.tsx`, `globals.css`, maybe new `hero-preview.tsx`
- Within system: keep headline/copy/CTA; enrich with layered product preview
  (reuse `product-window.tsx` condensed thread, metallic gradient border/fade per DESIGN.md richness move),
  primary CTA metallic gradient (DESIGN.md Button primary), motion already named (rise/fade; GSAP typing
  only if DESIGN.md Motion allows — else Motion reveal). Reduced-motion: static final state.
- No new colors/sizes/radii/shadows/fonts; 390px: no horizontal scroll, tap targets ≥44px.

## 2. Criterion → check map
| # | criterion | proves it (test / check name) |
| 1 | DESIGN.md updated first | `DESIGN.md` diff review: type-discipline section, demo parts named, palette/fonts/scales untouched |
| 2 | one walkthrough, no static steps | `how-walkthrough.test`: 4 tabs render; click Review → correction bubble highlighted; flow img appears ≤1× page-wide; no 3-tile grid |
| 3a | benchmark interactive, numbers exact | `benchmark-compare.test`: Cost/Tokens/Time tabs switch units; values equal `results.raw.json` ($1.59/$0.46/$0.30/$0.75, −53%, 20/20, 39,806/4,047/106,081); no other figures |
| 3b | skills work in miniature | `skill-demos.test` per demo incl. empty/invalid input, double-click, disabled Approve until checklist complete |
| 3c | harnesses selectable, real status | `harness-picker.test`: live vs coming-soon states; no invented status text |
| 4 | mono/uppercase audit | `type-audit.test` (or grep gate): no `uppercase`/`tracking-[0.1` outside terminal/code/data; `eyebrow` usages sentence case; `copy-tells.md` pass |
| 5 | richer hero in system | screenshots desktop+phone; 9-check review (guides/review.md); `check-prebuilt.mjs → ok`; `contrast.mjs → exit 0` |
| 6 | no regressions | `cd web && npm run build`, `npm run lint`; install route + `site.ts` links unchanged |

## 3. Files to create / change
- Create: `web/PLAN.md` (this file's build plan), `web/src/components/how-walkthrough.tsx`,
  `benchmark-compare.tsx` (or extend `cost-meters.tsx`), `skill-demos.tsx`, `harness-picker.tsx`,
  `hero-preview.tsx` (only if preview can't layer inside `page.tsx`), colocated tests
  (`*.test.tsx` per demo; runner: add `vitest` + RTL — QUESTION, no test setup exists in `web/`).
- Change: `.hstack/ui/DESIGN.md` (type discipline, demo parts, richness moves),
  `web/src/app/page.tsx` (compose), `product-window.tsx` (highlight prop for walkthrough),
  `globals.css` (eyebrow/kicker, theme vars from shadcn init), `layout.tsx` (font question),
  `web/package.json` (shadcn deps — only via CLI, QUESTION).
- Screenshots: `.hstack/ui/screens/landing-next/` desktop + phone.

## 4. Risks (brief's review list) → handling
- Invented benchmark claims: all figures from `results.md`/`results.raw.json` via `site.ts` only;
  sample-only percents labelled "sample". Test 3a asserts exact values.
- Mono/kicker leftovers: audit list in §1d + grep gate; `check-prebuilt.mjs` must print `ok`.
- Static-box leftovers: every feature/step maps to a demo in §1b–1c; review check 8 (show-don't-tell).
- 390px layout: tabs scroll horizontally (native), preview stacks, tap targets ≥44px; phone screenshots.
- OpenNext build: no new server code, all demos client-side sample state; `npm run build` + `preview`
  smoke; Cloudflare `wrangler.jsonc` untouched.

## 5. Done commands
`cd web && npm run build && npm run lint` ·
`node <skill>/tools/check-prebuilt.mjs .` → `ok` · `node <skill>/tools/contrast.mjs <css>` → exit 0 ·
screenshots desktop+phone → `.hstack/ui/screens/landing-next/` · 9-check review (guides/review.md).

## QUESTIONS (need frontier approval with plan)
1. shadcn `init + add` in `web/` (new deps/files) — or primitives-only?
2. Test runner: add `vitest` + Testing Library to `web/` (no test setup today)?
3. Fonts: DESIGN.md says Geist, code loads Inter + JetBrains Mono — switch code to Geist or amend DESIGN.md?
