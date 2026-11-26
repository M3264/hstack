import { Composition, Series } from "remotion";
import { Chats, Cards, Copies, Encrypt, Product } from "./scenes/patterns";
import { FPS, s, TOTAL_FRAMES } from "./script";
import { Video } from "./Video";

// Two compositions with the same timing: with the voice, and with music and sound effects only.
// Gallery plays the pattern examples in scenes/patterns.tsx back to back, 3 s each, to preview them.
const GALLERY = [Chats, Cards, Encrypt, Copies, Product];
function Gallery() {
  return <Series>{GALLERY.map((Scene, i) => <Series.Sequence key={i} durationInFrames={s(3)}><Scene /></Series.Sequence>)}</Series>;
}
export function Root() {
  return <>
    <Composition id="Video" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="VideoNoVoice" component={Video} defaultProps={{ voice: false }} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Gallery" component={Gallery} durationInFrames={s(3) * GALLERY.length} fps={FPS} width={1920} height={1080} />
  </>;
}
