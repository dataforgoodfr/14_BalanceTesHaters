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
  manifest: () => ({
    name: "Balance Tes Haters : outil de détection de commentaires malveillants",
    description:
      "L'outil Balance tes Haters permet de récupérer automatiquement des commentaires sous une ou plusieurs vidéos, et de les classer en fonction de leur agressivité, afin d'aider les victimes de cyberharcèlement à générer un dossier de plainte.",
    permissions: [
      "storage",
      "unlimitedStorage",
      "scripting",
      "alarms",
      "notifications",
      "downloads",
      "tabs",
      "activeTab",
      // CHrome specific permissions
      ...(import.meta.env.CHROME ? ["sidePanel"] : []),
    ],
    host_permissions: [
      "http://localhost:8080/*",
      "https://balanceteshaters-app.services.d4g.fr/*",
      "https://www.instagram.com/*",
      "https://www.youtube.com/*",
      "<all_urls>",
    ],
  }),
  hooks: {
    "build:manifestGenerated"(wxt, manifest) {
      if (wxt.config.browser === "firefox") {
        manifest.browser_specific_settings = {
          gecko: {
            id: "bth-extension@balanceteshaters.d4g.fr",
            update_url:
              "https://balanceteshaters-app.services.d4g.fr/updates/firefox.json",
          },
        };
        manifest.sidebar_action = {
          default_panel: "/scraping-sidepanel.html",
          default_title: "Balance Tes Haters",
          default_icon: {
            "16": "icons/16.png",
            "32": "icons/32.png",
            "48": "icons/48.png",
            "96": "icons/96.png",
            "128": "icons/128.png",
            "256": "icons/256.png",
          },
        };
      }
    },
  },
});
