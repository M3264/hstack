import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// The brand, from the product's own design tokens (guides/from-codebase.md). Fill these in first.
export const brand = {
  name: "Product",           // the product name as written
  url: "example.com",        // the website the video ends on
  logo: "logo.png",          // a file in public/
  accent: "#f5e73f",         // the brand color, used as fills only
  ink: "#0b0b0c",            // text on the light stage
  paper: "#f6f6f3",          // the light stage
  night: "#141416",          // the dark stage, if the storyboard is dark
  muted: "#71717a",
  line: "#e4e4e0",
};

export const sans = loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "600", "700"], subsets: ["latin"] }).fontFamily;
