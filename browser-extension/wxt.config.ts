import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
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
