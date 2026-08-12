import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // .tsx too: the PDF documents are React components, so their tests must be
    // able to write JSX. Next compiles the app with jsx "preserve"; vitest has
    // no Next pipeline, so the automatic runtime is set explicitly below.
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
