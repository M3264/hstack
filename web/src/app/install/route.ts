import { INSTALL_SCRIPT } from "./script";

// Static: built once, served from Cloudflare's edge.
export const dynamic = "force-static";

export function GET() {
  return new Response(INSTALL_SCRIPT, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
