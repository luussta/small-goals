import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  distDir: ".next-nextjs",
  ...(process.env.SMALL_GOALS_VINEXT ? {} : {
    turbopack: {
      resolveAlias: {
        "cloudflare:workers": "./src/lib/storage/cloudflare-workers-stub.ts",
      },
    },
  }),
};

export default nextConfig;
