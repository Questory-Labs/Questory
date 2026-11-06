import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./screenshots",
  testMatch: "*.capture.ts",
  outputDir: "./test-results/screenshots",
  workers: 1,
  retries: 1,
  timeout: 90_000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    contextOptions: { reducedMotion: "reduce" },
  },
});
