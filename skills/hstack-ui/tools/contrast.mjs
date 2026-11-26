#!/usr/bin/env node
// hstack-ui: WCAG contrast check for a shadcn theme, or for color pairs you pass.
// Usage: node <skill>/tools/contrast.mjs app/globals.css      (checks :root and .dark theme pairs)
//        node <skill>/tools/contrast.mjs "#0a0d14" "#e9edf3"  (one pair)
// Exit 1 when a pair is below its minimum.
import { readFileSync } from "node:fs";

function parse(c) {
  c = c.trim().toLowerCase();
  let m;
  if ((m = c.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  if ((m = c.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/))) return [m[1], m[2], m[3]].map((x) => +x / 255);
  if ((m = c.match(/^hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%/))) {
    const [h, s, l] = [+m[1], +m[2] / 100, +m[3] / 100];
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
  }
  if ((m = c.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/))) {
    const L = m[2] ? +m[1] / 100 : +m[1], C = +m[3], H = (+m[4] * Math.PI) / 180;
    const a = C * Math.cos(H), b = C * Math.sin(H);
    const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [
      4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
      -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
      -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
    ];
    return lin.map((v) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; });
  }
  return null;
}
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PAIRS = [
  ["foreground", "background", 4.5], ["muted-foreground", "background", 4.5], ["card-foreground", "card", 4.5],
  ["popover-foreground", "popover", 4.5], ["primary-foreground", "primary", 4.5], ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5], ["muted-foreground", "muted", 4.5], ["destructive", "background", 3], ["primary", "background", 3], ["ring", "background", 3],
];

let fail = 0;
const args = process.argv.slice(2);
if (args.length === 2 && parse(args[0])) {
  const r = ratio(parse(args[0]), parse(args[1]));
  console.log(`${args[0]} on ${args[1]}: ${r.toFixed(2)}:1 ${r >= 4.5 ? "ok (text)" : r >= 3 ? "ok only for large text and UI parts" : "FAIL"}`);
  process.exit(r >= 4.5 ? 0 : 1);
}
const css = readFileSync(args[0] ?? "app/globals.css", "utf8");
for (const [scope, re] of [[":root", /:root\s*\{([^}]*)\}/], [".dark", /\.dark\s*\{([^}]*)\}/]]) {
  const block = css.match(re);
  if (!block) continue;
  const vars = Object.fromEntries([...block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  for (const [fg, bg, min] of PAIRS) {
    if (!vars[fg] || !vars[bg]) continue;
    const a = parse(vars[fg]), b = parse(vars[bg]);
    if (!a || !b) { console.log(`${scope} ${fg}/${bg}: can't read "${vars[fg]}" or "${vars[bg]}"`); continue; }
    const r = ratio(a, b), ok = r >= min;
    if (!ok) fail++;
    console.log(`${scope} ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min}) ${ok ? "ok" : "FAIL"}`);
  }
}
process.exit(fail ? 1 : 0);
