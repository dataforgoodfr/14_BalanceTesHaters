import type { StorybookConfig } from "@storybook/react-vite";
import { resolve } from "dns";
import path from "path";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");

    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        tsconfigPaths: true,
      },
    });
  },
};

export default config;
