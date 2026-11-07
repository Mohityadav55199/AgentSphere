import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "public/**",
    "backups/**",
    "scripts/**",
    "docs/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  {
    // Pin the React version: eslint-plugin-react's auto-detection is not compatible with ESLint 10.
    settings: { react: { version: "19.2" } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // React Compiler advisory rule; the flagged effects are one-off mount initialisations.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
