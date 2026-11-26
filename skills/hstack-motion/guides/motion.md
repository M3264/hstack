# How things move

Motion is what separates a launch video from a slideshow. The kit has every piece below; use them,
don't rewrite them.

## The basics (kit/src/motion.ts)
- `rise(frame, delay, bouncy)`: a spring from 0 to 1. `bouncy` overshoots and settles; use it for
  anything that should feel alive (pills, icons, cards, words).
- `enter(frame, delay)`: fade in out of a slight blur while rising and scaling up with a small bounce.
  The default entrance for any element.
- `pop(frame, delay)`: a bigger bounce from small, with a slight rotation. For badges, icons, chips.
- `between(frame, start, end, from, to)`: eased movement with no overshoot. For camera moves, bars
  growing, lines drawing.
- Everything is timed in frames at 60 fps: `s(seconds)` converts; `at(sceneId, word)` gives the frame
  a word is spoken.

## Patterns (kit/src/kit.tsx and the example scenes)
Every row has a working example. `scenes/examples.tsx` holds the scenes of the default video, timed to
the script with `at`. `scenes/patterns.tsx` holds the rest with fixed timings; preview them all with the
`Gallery` composition. Copy the closest example, rename it, change the content, keep the motion. A
pattern not in this table is new code: say so in the plan.

On the dark stage (`<Stage dark>`), pass `dark` to `Slam` and `Glitchy` too.

| Pattern | Use it for | Kit |
|---|---|---|
| **Typed line** with a yellow marker on each fresh word | sentences, tag lines | `TypeLine` |
| **Slam** a huge word in from too big and blurred, out the same way | a run of punchy words ("Copied. Pasted. Forgotten.") | `Slam` |
| **Slot reels**: each letter spins on its own reel and they stop left to right | the product name, word swaps | `SlotWord` |
| **Rolling word**: one giant word rolls up out of a mask, the next replaces it | a list of verbs, with the real command typed under each | `Words` in `scenes/examples.tsx` |
| **Multiplying copies** on a tilted 3D plane while the camera pulls back | "it gets copied everywhere" | `Copies` in `scenes/patterns.tsx` |
| **Cards falling in** with a 3D tilt, and a **glitch** on the key word | "what goes wrong" | `Cards` in `scenes/patterns.tsx`, `Glitchy` |
| **Scramble to ciphertext**, then the characters collapse into a lock | encryption, hashing, anything sealed | `Encrypt` in `scenes/patterns.tsx` |
| **Nodes around a circle** pop in one by one, then lines connect them to the logo with pulses | "everything it does", features | `Nodes` in `scenes/examples.tsx` |
| **Bars** growing on the word, a counter ticking | pricing, metrics | `Bars` in `scenes/examples.tsx` |
| **Chat windows** filling with messages, one ping each (generic windows, never a real app's UI) | "how people do it today" | `Chats` in `scenes/patterns.tsx` |
| **Product window** tilted in 3D, slowly turning, a light sweep across it | showing the real app | `Product` in `scenes/patterns.tsx`: `Tilt`, `Window`, `Shine` |

## Rules
1. **Every entrance springs.** No element simply fades in.
2. **Stagger, never all at once:** 4–8 frames between siblings.
3. **Land on the word.** Anything the voice names appears on that word (`at(id, word)`), a few frames
   early.
4. **Keep the camera alive:** a slow push or pan across every scene, never a dead still frame.
5. **Light mode by default** (off-white paper, black type, faint dot grid, a soft glow of the brand
   color, a little grain). The brand color is used as **fills** (markers, pills, blocks, a lock),
   never as text on white.
6. **Terminals fill from the top down**, like real ones, and scroll once full.
7. **Real content only:** real commands and output, the app's real screens rebuilt from its own CSS.
8. **No static lists.** A checklist becomes nodes, chips or a rolling word.
9. **One idea per scene**; at most two lines of text on screen at once.
