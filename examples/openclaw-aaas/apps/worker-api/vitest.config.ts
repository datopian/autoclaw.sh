import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@cloudflare/sandbox": fileURLToPath(
        new URL("./test/shims/cloudflare-sandbox.ts", import.meta.url)
      ),
      "cloudflare:workers": fileURLToPath(
        new URL("./test/shims/cloudflare-workers.ts", import.meta.url)
      )
    }
  }
});
