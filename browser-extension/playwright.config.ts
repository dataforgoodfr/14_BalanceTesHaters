import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Extensions need serial execution
  workers: 1, // Single worker for extension tests
  reporter: "html",
  use: {
    baseURL: "https://www.youtube.com",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    // Mock server for backend API
    command: "npx tsx e2e/mock-server.ts",
    port: 8000,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
