import { bindings, defineConfig, defineWorker } from "cf/config";

const appName = process.env.APP_NAME?.trim() || "Small Goals";

export default defineConfig({
  worker: defineWorker({
    name: "small-goals",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-04",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      APP_NAME: bindings.text(appName),
      DATABASE_URL: bindings.secret(),
      AGENT_API_TOKEN: bindings.secret(),
      APP_ACCESS_PASSWORD: bindings.secret(),
    },
  }),
});
