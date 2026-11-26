---
name: hstack-motion
description: Motion-graphics videos under hstack. Use only when the user invokes /hstack-motion to make a promo, launch, teaser, explainer or product video (YouTube, social, landing-page hero) from a prompt or from a codebase. The worker writes a storyboard and script first, builds scenes in Remotion from a starter kit (springs, slot reels, scene transitions, voice and sound timed to words), and the frontier reviews stills before anything is rendered in full.
purpose: Launch-quality motion graphics from a small model, with no slideshow fades, no robotic voice and no invented claims.
author: shellhaki
version: 0.1.1
disable-model-invocation: true
---

# hstack-motion

If hstack isn't on in this session yet, do the "Turning it on" steps in the `hstack` skill first to
pick the worker, then continue here. The brief, review and token rules of `hstack` all apply; this
skill adds the video-specific steps.

A video here is code: a [Remotion](https://remotion.dev) project (React, rendered frame by frame to MP4).
The worker never invents a look, a fact or a timing. Every choice comes from one of four places, and
anything none of them answers is a `QUESTION`, never a guess:

1. `.hstack/motion/STORYBOARD.md`: the story, scene by scene, with the script line for each.
2. The product itself: its real UI tokens, real commands and output, real prices
   (`guides/from-codebase.md`), or the user's prompt when there is no codebase.
3. The starter kit in `<skill>/kit/`: the stage, springs, typed lines, slot reels, slams,
   transitions, and voice and sound timed to words. **Never hand-roll what the kit has.**
4. The guides: `guides/motion.md` (how things move), `guides/transitions.md`,
   `guides/voice.md`, `guides/sound.md`, `guides/story.md`.

## Files in the user's project
```
video/                    the Remotion project (copied from <skill>/kit)
.hstack/motion/
  STORYBOARD.md           the story; every later change reads this first
  stills/                 frames the worker rendered for review
```

## The loop

Steps 1 and 2 are **gates**: no scene is built until the storyboard is approved.

**0. Is there an approved `.hstack/motion/STORYBOARD.md`?** Yes: skip to step 3.

**1. Facts first.** From a codebase, the worker collects what the video may say, following
`guides/from-codebase.md`: product name and one-line pitch, the real UI (colors, fonts, the app's
own components), real commands and what they print, real prices from the code, and the domain.
From a prompt, the same list from the prompt, with every gap as `[NEED: …]`. Prices or claims about
competitors are checked on the competitors' own sites and footnoted with the date; never from memory.

**2. Storyboard (the most important review).** The worker fills `templates/storyboard.md` following
`guides/story.md`: length, format (16:9 / 9:16), light or dark, voice or not, then one row per scene
with the script line, what is on screen, the motion pattern from `guides/motion.md`, the transition
into it and the sounds. The frontier reviews it against `guides/story.md` (structure, fairness,
pacing, one idea per scene) and approves it or sends exact fixes.

**3. Set up.** Copy `<skill>/kit` to `video/`, rename its `gitignore` to `.gitignore`, `bun install`
(Remotion needs ffmpeg on PATH for the voice tempo step), set the brand tokens in
`video/src/theme.ts` from step 1, and put the logo in `video/public/`. Write the script lines from the
storyboard into `video/src/script.ts`.

**4. Voice and sound.** With an ElevenLabs key in `video/.env` (`ELEVENLABS_API_KEY=…`), run
`bun run voice` and `bun run sfx` (`guides/voice.md`, `guides/sound.md`). The voice writes the time
of every word, so scenes last as long as their line and motion lands on words (`at(id, word)`).
Without a key, timings are estimated from the text and the video still renders silent.

**5. Build scenes** in `video/src/scenes/`, one component per storyboard row, using only the kit's
pieces and the patterns in `guides/motion.md`. Register them in `video/src/Root.tsx` with the
transition the storyboard names. No new colors, fonts or easings outside `theme.ts` and `motion.ts`.

**6. Verify.** `bunx tsc --noEmit` passes. Then render stills, not the video:
`bash <skill>/tools/stills.sh video <composition> <frame> <frame> …` writes one contact sheet to
`.hstack/motion/stills/sheet.png`. Pick frames mid-animation and mid-transition as well as at rest.
Read the sheet against `guides/review.md` before asking for review.

**7. Review (frontier).** Review the contact sheet and the storyboard together with
`guides/review.md`. One correction round with exact fixes (scene, element, expected value).

**8. Render.** `bunx remotion render <composition> out/<name>.mp4` (1080p60). For the final upload,
`--scale=2` for 4K. Always render a version without the voice as well (`<composition>NoVoice`), so
the user can choose. Report the files, lengths and anything to check before publishing (prices, music
rights).

## Not hstack-ui
This skill runs only when the user invokes `/hstack-motion`. A video is not an interface: the
`hstack-ui` rules (no typing animations, no fake terminals) don't apply here. Typed lines and real
commands in a terminal window are core patterns of this skill. The monospace font is for commands and
their output only, never for headlines or captions.

## Rules that prevent slop
- **Nothing just fades in, and no scene hard-cuts.** Every entrance springs (overshoot and settle),
  every scene hands over with a camera transition and a sound under it.
- **Show the product, not stock shapes:** the real UI, real commands, real output, rebuilt as
  components, never screenshots of someone else's product and never invented numbers.
- **One idea per scene, a few words on screen.** The voice says it; the screen shows it.
- **The voice sounds spoken, not read** (`guides/voice.md`), and lists are read as one phrase.
- **Competitors are named fairly**, compared like with like, with dated, sourced prices.
- **No copying a reference video:** take its direction (pace, structure, techniques), never its scenes.
