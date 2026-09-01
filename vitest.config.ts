import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"], alias: { modules: path.resolve(__dirname, "modules") } },
  test: {
    include: ["**/*.spec.ts"],
  },
});
