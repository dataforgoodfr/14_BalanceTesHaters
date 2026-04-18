import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  autoIcons: {
    enabled: true,
    developmentIndicator: false,
    baseIconPath: "assets/bth-icon.svg",
    sizes: [16, 32, 48, 96, 128, 256],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Balance Tes Haters : outil de détection de commentaires malveillants",
    permissions: [
      "storage",
      "scripting",
      "background",
      "downloads",
      "tabs",
      "unlimitedStorage",
      "activeTab",
      "alarms",
      "notifications",
      "sidePanel",
    ],
    host_permissions: ["<all_urls>"],
  },
});
