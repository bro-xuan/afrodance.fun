import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// The site has no ISR or revalidation: pages are either prerendered at build
// time or fully dynamic (every API route is force-dynamic). Serving the
// prerendered pages straight from the static assets is enough, so no R2
// bucket is needed.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
