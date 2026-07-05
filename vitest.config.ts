import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    // Mirrors the path aliases in tsconfig.json — keep the two in sync.
    alias: [
      { find: /^@\/components\/(.*)$/, replacement: `${root}components/$1` },
      { find: /^@\/lib\/(.*)$/, replacement: `${root}lib/$1` },
      { find: /^@\/public\/(.*)$/, replacement: `${root}public/$1` },
      { find: /^@\/styles\/(.*)$/, replacement: `${root}src/styles/$1` },
      { find: /^@\/(.*)$/, replacement: `${root}src/$1` },
    ],
  },
});
