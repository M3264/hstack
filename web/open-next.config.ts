// The landing page is fully static, so no incremental cache (R2/KV) is needed.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
