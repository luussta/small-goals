import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  { ignores: [".next/**", ".next-nextjs/**", ".open-next/**", ".cloudflare/**", ".vinext/**", ".wrangler/**", "out/**", "node_modules/**", "next-env.d.ts"] },
);
