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
      // storage and unlimitedStorage used to store post snapshots
      "storage",
      "unlimitedStorage",
      // Scripting required for running content script in scraped pages
      "scripting",

      // background, alarms and notifications required to poll server in background
      // for classificaiton results and notify user
      "background",
      "alarms",
      "notifications",
      // Downloads required to download reports
      "downloads",
      // Tabs required mostly to query tab in e2e tests
      "tabs",
      // Active tab needed to captureVisibleTab and get current tab info
      "activeTab",
      // Sidepanel needed to display scraping progresss
      "sidePanel",
    ],
    host_permissions: [
      // Allow sending data to backend server
      "http://localhost:8080/*",
      "https://balanceteshaters-app.services.d4g.fr/*",
      // Allow access to scraped pages content
      "https://www.instagram.com/*",
      "https://www.youtube.com/*",
      // <all_urls> required for captureVisibleTab when scrap started outside of "activeTab" scope that is from "Relance analyse"
      "<all_urls>",
    ],
  },
});
