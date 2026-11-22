# Design system
Reference: Supabase, https://supabase.com, captured in .hstack/ui/references/supabase/
Note: white + metallic steel-blue by user order; amber and green removed, 2026-11-22; rest of system still traces to Supabase tiles.

## Tokens
Colors (role: value): background #0C0C0C, surface #161616, surface-2 #1C1C1C, text #FAFAFA, muted #A1A1AA, border rgba(255,255,255,0.08) 1px, primary linear-gradient(90deg,#D7E7FA,#8AB4E8,#5B8AC4) (metallic steel-blue sheen), primary-text #0C0C0C, accent #8AB4E8 (metallic blue), danger [ASK], success #8AB4E8 (metallic blue checks)
Fonts: display Geist 600 (neo-grotesk, tracking -0.04em), text Geist 400, mono Geist Mono 400
Type scale (px / lh / weight): xs 12/16/400, sm 14/20/400, base 16/24/400, lg 18/28/400, xl 20/28/600, 2xl 30/36/600, display 48/52/600 desktop, 36/40/600 phone
Spacing scale: 4 8 12 16 24 32 48 64 96 128 (use only these)
Radius: controls 8, cards 12, pills full
Borders: 1px rgba(255,255,255,0.08); shadows: none (hairline borders separate, never shadows)
Motion: see Motion section (two libraries only); prefers-reduced-motion shows all content at final state
Focus ring: 2px #8AB4E8 outline, 2px offset
Mobile nav: wordmark + primary CTA only, section links hidden below 720px
Footer: 1px hairline top border, sm muted text, page gutters

## Motion
Libraries (no others): Motion (motion.dev, React) for section reveals and hover micro-interactions; GSAP for hero terminal typing, cost-bar growth, and number counters.
Durations: section reveal 400ms ease-out; cost bars and number counters 900ms; hero terminal typing per-char.
Reduced motion: prefers-reduced-motion disables all animation, content shown at final state.
No other animation libraries, no parallax/scroll-jacking.

## Layout
Content widths: text 720, page 1280; gutters: desktop 24, phone 16
Shells used: marketing only (no app/sidebar/header; dashboard screenshot in sec-03 is reference illustration, not a shell we build)
Section rhythm: vertical padding desktop 96, phone 48
Density: comfortable; comfortable-dense for new sections (skills roster, harnesses, benchmark detail) using existing spacing/type scales only

## Imagery
Palette black/white/grey + metallic steel-blue highlights; no stock photos, no text inside images.
Generated art lives in landing-app/public/img/, presented edge-to-edge inside 12px-radius hairline cards or full-bleed section bands with background #0C0C0C so edges disappear.
Used for: hero side visual or section band (frontier-to-workers routing), skill-bank band, benchmark band.
Alt text required on every image; decorative duplicates are aria-hidden.

## Components (variant names this project uses)
Logo: Lucide Workflow icon mark in a metallic-gradient (90deg #D7E7FA→#8AB4E8→#5B8AC4) rounded-8 square with dark (#0C0C0C) glyph, 28px, left of the "hstack" wordmark; footer uses the same mark at 20px. No custom SVG logo.
Button: primary (metallic steel-blue gradient 90deg #D7E7FA→#8AB4E8→#5B8AC4 with primary-text #0C0C0C, h 40, 8px radius, hover = same fill at 90% brightness), secondary (dark fill, 1px border, h 40), ghost (text-only nav), destructive [ASK]; one primary per view
Input, select, checkbox, switch: [ASK] (no form controls in inspected tiles; derive h 40, 8px radius, surface-2 bg (derived))
Card: surface bg, 1px hairline border, 12px radius, icon + title 16/600 + muted body 14; no shadow
Table, filters, charts: [ASK] (none in tiles)
Terminal proof card (quiet transcript, no window chrome): flat surface panel, 1px hairline border, 12px radius, no traffic-light dots, no drop shadow; header row is a single hairline-separated strip with mono 12px muted label (e.g. "hstack session") and the copy button; body mono 13px with generous padding 24, white commands, muted output, white block cursor; terminal syntax palette = text #FAFAFA, muted #A1A1AA, accent #8AB4E8 for prompt/cursor/figures (mono is only for terminal, install commands, and inline code)
Cost figures (derived from pricing tile): display sans 48/600, muted 14 suffix, metallic-blue (#8AB4E8) check + 14px feature lines, metallic-gradient directed/worker bar with muted-grey baseline bar
Tabs (Table Editor / SQL Editor / RLS Policies pill row): pill full radius, active = white-text fill, inactive = ghost
Badge: "Most Popular" pill, white (#FAFAFA) text on white-tinted fill (derived)
Copy button: secondary button in terminal card header strip; on success label swaps to Copied for 1.6s using existing text/primary tokens; no toast.
States for every data view: empty (icon, one line, one action), loading (skeleton), error (message + retry) — all (derived, no states in tiles)

## Type discipline
Mono (Geist Mono in DESIGN, JetBrains Mono in code until the Geist question is settled) is ONLY for:
install commands, the terminal transcript, skill names as typed identifiers (e.g. `hstack-activate`),
inline `<code>`, and table/data numbers (tabular-nums OK in the text face where the design prefers it).
Everything else — eyebrows, step labels, skill/harness tags, status/helper text, section labels —
is sentence-case text face in a muted tone. At most one eyebrow per page, sentence case, only when
it adds info the heading lacks (e.g. "Benchmark 2 · production waitlist backend · Claude Code").
No numbered eyebrows, no uppercase tracking above headings. Cost-figure values (e.g. $0.75, −53%)
are data: semibold text face with tabular-nums.

## Interactive demos (built from registry parts, sample data only)
Walkthrough (How it works): `tabs` (Brief | Plan | Build | Review) driving one product preview
(`product-window.tsx` with a highlight prop); the flow image appears at most once page-wide, inside
the relevant tab, never as a standalone tile. No grid of static step boxes.
Benchmark: interactive `tabs` (Cost | Tokens | Time) over the exact `site.ts` + `results.md` figures;
the replaying cost bars (`CostMeters`) stay as the Cost tab content. No new numbers.
Skills (4 working miniatures, each with idle/success/error states, all client-side sample state):
`hstack-activate` name-validation (`input` + `label` + `button`); `hstack` brief checklist
(`checkbox` × 5, Approve `button` disabled until all checked); `hstack-swarm` parallel lanes
(`progress` × 3, sample percents labelled "sample", animate once on view); `hstack-practice`
before/after spec example (toggle between the two renderings). Cards (`card`) frame each miniature.
Harnesses: selectable rows (`toggle-group`, one live + three coming-soon), each row a `card`-like
tile; selecting a row shows its proof points below. Live row keeps the typed `/hstack-activate`
identifier in mono; "Coming soon" is sentence-case text face.
Failure visibility: every demo has an error/empty state; failure never reports success.

## Richness moves (newly allowed, still in system)
Hero: layered product preview (condensed `product-window.tsx` thread) behind/below the headline,
primary CTA in the metallic steel-blue gradient (Button primary). Flow image folded into the
walkthrough preview (single source, not duplicated). Motion stays Motion + GSAP with
`prefers-reduced-motion` final-state fallback. No new colors, sizes, radii, shadows or fonts.

## Signature (what makes it look like the reference)
Near-black bg with hairline 1px borders at 8% white, zero shadows.
Hero display 48px tight-tracked white with metallic-blue (#8AB4E8) second line; mono accents (CLI snippets, install commands, inline code) in white, links in metallic blue.
Feature grid: 12px-radius dark cards with line-icon + bold-white/regular-mute two-tone copy.

## Do / don't (project-specific)
Do: one metallic steel-blue primary CTA per viewport; terminal/code proof rendered as flat hairline-bordered dark transcript panel with mono type, no chrome.
Don't: no light surfaces, no shadows, no hues beyond white + metallic steel-blue.
[ASK]: danger/error red; form control styling beyond the derived note; table/filter/chart rules; empty/loading/error visuals.
