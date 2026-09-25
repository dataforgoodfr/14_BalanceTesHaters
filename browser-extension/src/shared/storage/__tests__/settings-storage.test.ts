import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  DEFAULT_SETTINGS,
  getSettings,
  SETTINGS_STORAGE_KEY,
  setSettings,
  type Settings,
} from "../settings-storage";

describe("settings storage", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("stores and returns defaults when settings are missing", async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    await expect(
      browser.storage.local.get(SETTINGS_STORAGE_KEY),
    ).resolves.toEqual({
      [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS,
    });
  });

  it("returns stored settings", async () => {
    const settings: Settings = {
      skipScreenshoting: true,
      skipSubmitForClassification: true,
    };
    await browser.storage.local.set({
      [SETTINGS_STORAGE_KEY]: settings,
    });

    await expect(getSettings()).resolves.toEqual(settings);
  });

  it("replaces malformed settings with defaults", async () => {
    await browser.storage.local.set({
      [SETTINGS_STORAGE_KEY]: {
        skipScreenshoting: "yes",
        skipSubmitForClassification: true,
      },
    });

    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    await expect(
      browser.storage.local.get(SETTINGS_STORAGE_KEY),
    ).resolves.toEqual({
      [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS,
    });
  });

  it("writes settings under the versioned key", async () => {
    const settings: Settings = {
      skipScreenshoting: true,
      skipSubmitForClassification: false,
    };

    await setSettings(settings);

    await expect(
      browser.storage.local.get(SETTINGS_STORAGE_KEY),
    ).resolves.toEqual({
      [SETTINGS_STORAGE_KEY]: settings,
    });
  });
});
