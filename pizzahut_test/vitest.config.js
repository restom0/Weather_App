import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dedicated Vitest config (kept separate from vite.config.js so the dev API
// middleware and env loading don't run during tests).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    include: ["src/**/*.test.{js,jsx}", "api/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      // Report on all source files, not just the ones touched by a test.
      all: true,
      include: ["src/**/*.{js,jsx}", "api/**/*.js"],
      exclude: [
        "src/main.jsx",
        "src/test/**",
        "**/*.test.{js,jsx}",
      ],
    },
  },
});
