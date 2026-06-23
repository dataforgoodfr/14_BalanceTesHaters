import { test as base, chromium, BrowserContext } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

const CHROME_BUILD_PATH = "../.output/chrome-mv3";

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const pathToExtension = path.join(
      __dirname,
      process.env.PATH_TO_EXTENSION || CHROME_BUILD_PATH,
    );
    const pathToBrowserContext = process.env.PATH_TO_BROWSER_CONTEXT || "";
    console.log("using pathToBrowserContext", pathToBrowserContext);
    const context = await chromium.launchPersistentContext(
      pathToBrowserContext,
      {
        headless: false, // Extensions require headed mode
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
          "--mute-audio",
        ],
        viewport: {
          width: 1920,
          height: 1080,
        },
      },
    );
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Get extension ID from the background page
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});

export { expect } from "@playwright/test";
