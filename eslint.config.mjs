import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  { ignores: [".next/**", ".open-next/**", ".wrangler/**", "out/**", "node_modules/**", "next-env.d.ts"] },
);
