import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    const { default: tsconfigPaths } = await import("vite-tsconfig-paths");
    return mergeConfig(config, {
      plugins: [tailwindcss(), tsconfigPaths()],
    });
  },
};

export default config;
