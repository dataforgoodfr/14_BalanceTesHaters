import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: [
      "storage",
      "scripting",
      "background",
      "debugger",
      "downloads",
      "tabs",
      "unlimitedStorage",
      "activeTab",
    ],
    host_permissions: ["<all_urls>", "https://www.youtube.com/*"],
  },
});
