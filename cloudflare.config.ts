import { bindings, defineConfig, defineWorker } from "cf/config";

const appName = process.env.APP_NAME?.trim() || "Small Goals";
const bucketName = process.env.SMALL_GOALS_BUCKET_NAME?.trim() || "small-goals-data";
const workerName = process.env.SMALL_GOALS_WORKER_NAME?.trim() || "small-goals";

export default defineConfig({
  worker: defineWorker({
    name: workerName,
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-04",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      APP_NAME: bindings.text(appName),
      SMALL_GOALS_BUCKET: bindings.r2({ name: bucketName }),
      AGENT_API_TOKEN: bindings.secret(),
      APP_ACCESS_PASSWORD: bindings.secret(),
    },
  }),
});
