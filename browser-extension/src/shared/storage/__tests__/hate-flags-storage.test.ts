import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  getPostHateFlags,
  HATE_FLAGS_STORAGE_KEY_PREFIX,
  type PostHateFlags,
} from "../hate-flags-storage";

describe("hate flags storage", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("stores and returns defaults when no post stored", async () => {
    await expect(getPostHateFlags("test-id")).resolves.toEqual({});
  });

  it("stores and returns defaults when no comments are stored", async () => {
    const hateFlags: PostHateFlags = {};
    await browser.storage.local.set({
      [HATE_FLAGS_STORAGE_KEY_PREFIX + "test-id"]: hateFlags,
    });
    await expect(getPostHateFlags("test-id")).resolves.toEqual({});
  });

  it("returns stored hate flags", async () => {
    const hateFlags: PostHateFlags = {
      commentIdPlusHash: true,
    };
    await browser.storage.local.set({
      [HATE_FLAGS_STORAGE_KEY_PREFIX + "test-id"]: hateFlags,
    });

    await expect(getPostHateFlags("test-id")).resolves.toEqual(hateFlags);
  });
});
