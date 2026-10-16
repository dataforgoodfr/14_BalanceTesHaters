import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  deleteAllPostHateFlags,
  deletePostHateFlags,
  deletePostHateFlagsList,
  getPostHateFlags,
  getPostHateFlagsList,
  setPostHateFlags,
  type PostHateFlags,
} from "../hate-flags-storage";

describe("hate flags storage", () => {
  let getKeysMock: ReturnType<typeof vi.fn<() => Promise<string[]>>>;

  const hateFlag1: PostHateFlags = {
    commentIdPlusHash: true,
  };
  const hateFlag2: PostHateFlags = {
    commentIdPlusHash: false,
  };
  const hateFlag3: PostHateFlags = {
    commentIdPlusHash: false,
  };

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
    await setPostHateFlags("test-id", hateFlags);
    await expect(getPostHateFlags("test-id")).resolves.toEqual({});
  });

  it("returns stored hate flags", async () => {
    const hateFlags: PostHateFlags = {
      commentIdPlusHash: true,
    };
    await setPostHateFlags("test-id", hateFlags);

    await expect(getPostHateFlags("test-id")).resolves.toEqual(hateFlags);
  });

  it("returns stored hate flags list", async () => {
    await setPostHateFlags("first", hateFlag1);
    await setPostHateFlags("second", hateFlag2);
    await setPostHateFlags("third", hateFlag3);

    await expect(getPostHateFlagsList(["first", "second"])).resolves.toEqual([
      hateFlag1,
      hateFlag2,
    ]);
  });

  it("deletes all hate flags without deleting other storage data", async () => {
    await setPostHateFlags("first", hateFlag1);
    await setPostHateFlags("second", hateFlag2);
    await browser.storage.local.set({ unrelated: "preserved" });

    await deleteAllPostHateFlags();

    await expect(browser.storage.local.getKeys()).resolves.toEqual([
      "unrelated",
    ]);
    await expect(browser.storage.local.get("unrelated")).resolves.toEqual({
      unrelated: "preserved",
    });
  });

  it("deletes hate flags for one post only", async () => {
    await setPostHateFlags("first", hateFlag1);
    await setPostHateFlags("second", hateFlag2);

    await deletePostHateFlags("first");

    await expect(getPostHateFlags("first")).resolves.toEqual({});
    await expect(getPostHateFlags("second")).resolves.toEqual(hateFlag2);
  });

  it("deletes hate flags for the given post list only", async () => {
    await setPostHateFlags("first", hateFlag1);
    await setPostHateFlags("second", hateFlag2);
    await setPostHateFlags("third", hateFlag3);

    await deletePostHateFlagsList(["first", "third"]);

    await expect(getPostHateFlags("first")).resolves.toEqual({});
    await expect(getPostHateFlags("second")).resolves.toEqual(hateFlag2);
    await expect(getPostHateFlags("third")).resolves.toEqual({});
  });
});
