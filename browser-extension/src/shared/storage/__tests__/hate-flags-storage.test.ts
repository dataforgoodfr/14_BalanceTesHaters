import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  deleteAllPostHateFlags,
  deletePostHateFlags,
  deletePostHateFlagsList,
  getPostHateFlags,
  HATE_FLAGS_STORAGE_KEY_PREFIX,
  type PostHateFlags,
} from "../hate-flags-storage";

describe("hate flags storage", () => {
  let getKeysMock: ReturnType<typeof vi.fn<() => Promise<string[]>>>;

  beforeEach(() => {
    fakeBrowser.reset();
    // fakeBrowser does not implement getKeys yet.
    getKeysMock = vi.fn(async () => {
      return Object.keys(await browser.storage.local.get(null));
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(browser.storage.local, "getKeys").mockImplementation(getKeysMock);
    vi.resetModules();
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

  it("deletes all hate flags without deleting other storage data", async () => {
    await browser.storage.local.set({
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}first`]: { first: true },
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}second`]: { second: false },
      unrelated: "preserved",
    });

    await deleteAllPostHateFlags();

    await expect(browser.storage.local.getKeys()).resolves.toEqual([
      "unrelated",
    ]);
    await expect(browser.storage.local.get("unrelated")).resolves.toEqual({
      unrelated: "preserved",
    });
  });

  it("deletes hate flags for one post only", async () => {
    await browser.storage.local.set({
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}first`]: { first: true },
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}second`]: { second: false },
    });

    await deletePostHateFlags("first");

    await expect(getPostHateFlags("first")).resolves.toEqual({});
    await expect(getPostHateFlags("second")).resolves.toEqual({
      second: false,
    });
  });

  it("deletes hate flags for the given post list only", async () => {
    await browser.storage.local.set({
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}first`]: { first: true },
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}second`]: { second: false },
      [`${HATE_FLAGS_STORAGE_KEY_PREFIX}third`]: { third: true },
    });

    await deletePostHateFlagsList(["first", "third"]);

    await expect(getPostHateFlags("first")).resolves.toEqual({});
    await expect(getPostHateFlags("second")).resolves.toEqual({
      second: false,
    });
    await expect(getPostHateFlags("third")).resolves.toEqual({});
  });
});
