// vitest.config.ts
import { configDefaults, defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          exclude: [...configDefaults.exclude, "e2e/**"],
        },
      },
    ],
  },
});
