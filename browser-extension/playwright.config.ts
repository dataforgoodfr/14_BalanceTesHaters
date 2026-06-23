import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Extensions need serial execution
  workers: 1, // Single worker for extension tests
  reporter: "html",
  use: {
    screenshot: "on",
    trace: "on",
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
