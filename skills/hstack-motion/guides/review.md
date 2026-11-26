# Reviewing a video

Review stills, not full renders: a contact sheet of 8–15 frames costs seconds, a full render minutes.
Take frames at rest, mid-animation and mid-transition (`tools/stills.sh`). Frames start at 0 and end
one before the composition's length (Remotion prints the length on an out-of-range frame).

## Checklist
- [ ] Follows the approved storyboard, scene by scene; nothing invented.
- [ ] Every element is inside the frame and nothing overlaps by accident (long text in bubbles wraps).
- [ ] At most two lines of text on screen; every word readable at phone size.
- [ ] The brand color is only fills on light backgrounds; contrast is fine.
- [ ] Entrances spring and stagger; nothing just fades in; the camera keeps moving.
- [ ] Transitions vary and each has a sound.
- [ ] Motion lands on the spoken word (compare `at()` cues with the voice).
- [ ] Real product UI, commands and numbers, matching the code; competitor facts dated and sourced.
- [ ] The voice line sounds spoken: listen to each generated line once (`public/voice/<id>.mp3`).
- [ ] Both versions render (with and without voice), at the length expected.

Corrections name the scene, the element and the expected value ("Problem: WhatsApp bubble text
overflows; add overflowWrap anywhere"), never "make it nicer".
