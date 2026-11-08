import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        // The markdown preview's ESM build imports .css files; let Vite transform it instead of
        // handing it to Node (which cannot import CSS).
        inline: [/@uiw\/react-md-editor/, /@uiw\/react-markdown-preview/],
      },
    },
  },
});
