import tsParser from "@typescript-eslint/parser";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "backups/**", "scripts/**", "*.config.*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
