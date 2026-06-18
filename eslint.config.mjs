import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — not our code.
    "src/generated/**",
  ]),
  {
    rules: {
      // The mounted/hydration-guard pattern legitimately sets state in an
      // effect; keep this as a hint rather than a hard build failure.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
