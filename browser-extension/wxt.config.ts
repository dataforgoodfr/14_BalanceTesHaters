import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const isWsl =
  process.platform === "linux" &&
  (process.env.WSL_DISTRO_NAME !== undefined ||
    process.env.WSL_INTEROP !== undefined);
const wslChromiumBinary = isWsl
  ? (process.env.CHROMIUM_BIN ??
    ["/snap/bin/chromium", "/usr/bin/chromium"].find(existsSync))
  : undefined;

const chromiumProfile = process.env.VITE_SOAK_TEST_BUILD
  ? resolve(".wxt/chromium-data-soak")
  : resolve(".wxt/chromium-data");

if (!existsSync(chromiumProfile)) {
  mkdirSync(chromiumProfile, { recursive: true });
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  hooks: {
    "entrypoints:resolved": (_wxt, entrypoints) => {
      const excludedEntrypoints = new Set<string>();
      const soakTestBuild = process.env.VITE_SOAK_TEST_BUILD === "true";
      if (soakTestBuild) {
        console.log(
          "VITE_SOAK_TEST_BUILD===true => Include soak-controller entrypoint",
        );
      } else {
        console.log(
          "VITE_SOAK_TEST_BUILD!==true => Excluding soak-controller entrypoint",
        );
        excludedEntrypoints.add("soak-controller");
      }

      excludedEntrypoints.forEach((excludedEntryPointName) => {
        const entryPoint = entrypoints.find(
          (ep) => ep.name === excludedEntryPointName,
        );
        if (entryPoint) {
          entryPoint.skipped = true;
        } else {
          throw new Error(
            "could not find entrypoint with name:" + excludedEntryPointName,
          );
        }
      });
    },
  },
  webExt: {
    chromiumProfile: chromiumProfile,
    keepProfileChanges: true,
    binaries: wslChromiumBinary ? { chrome: wslChromiumBinary } : undefined,
  },
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  autoIcons: {
    enabled: true,
    developmentIndicator: false,
    baseIconPath: "assets/bth-icon.svg",
    sizes: [16, 32, 48, 96, 128, 256],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      sourcemap: true,
    },
  }),
  manifest: {
    name: "Balance Tes Haters : outil de détection de commentaires malveillants",
    // Must be less than 132 characters for Chrome web store
    description:
      "Balance tes Haters récupère les commentaires pour aider les victimes de cyberharcèlement à créer un dossier de plainte.",
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
      // For Memory and cpu monitoring in soak testing
      ...(process.env.VITE_SOAK_TEST_BUILD === "true"
        ? (["processes"] as const)
        : []),
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
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    web_accessible_resources: [
      {
        resources: ["**.js.map"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
