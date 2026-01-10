import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { shadowCljs } from "../../../../src";

export default defineConfig({
  plugins: [
    shadowCljs({
      buildIds: ["browser", "worker"],
      configPath: "shadow-cljs.edn",
    }),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      config: {
        main: "virtual:shadow-cljs/worker",
      },
    }),
  ],
});
