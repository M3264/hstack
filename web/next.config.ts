import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static marketing page: images are pre-sized local files, so skip the optimizer (no Cloudflare Images binding needed).
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
