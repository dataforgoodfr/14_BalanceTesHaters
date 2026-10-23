import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  commentHateFlagKey,
  deleteAllPostHateFlags,
  deletePostHateFlags,
  deletePostHateFlagsList,
  getPostHateFlags,
  getPostHateFlagsList,
  setPostHateFlags,
  updateCommentHateFlags,
  type PostHateFlags,
} from "../hate-flags-storage";

describe("hate flags storage", () => {
  let getKeysMock: ReturnType<typeof vi.fn<() => Promise<string[]>>>;

  const hateFlag1: PostHateFlags = {
    postId: "first",
    hateFlags: {
      hash1: true,
      hash2: false,
    },
  };
  const hateFlag2: PostHateFlags = {
    postId: "second",
    hateFlags: {
      hash: false,
    },
  };
  const hateFlag3: PostHateFlags = {
    postId: "third",
    hateFlags: {
      hash: false,
    },
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
    await expect(getPostHateFlags("test-id")).resolves.toEqual({
      postId: "test-id",
      hateFlags: {},
    });
  });

  it("stores and returns defaults when no comments are stored", async () => {
    const hateFlags: PostHateFlags = {
      postId: "test-id",
      hateFlags: {},
    };
    await setPostHateFlags("test-id", hateFlags);
    await expect(getPostHateFlags("test-id")).resolves.toEqual(hateFlags);
  });

  it("returns stored hate flags", async () => {
    await setPostHateFlags(hateFlag1.postId, hateFlag1);

    await expect(getPostHateFlags(hateFlag1.postId)).resolves.toEqual(
      hateFlag1,
    );
  });

  it("returns stored hate flags list", async () => {
    await setPostHateFlags(hateFlag1.postId, hateFlag1);
    await setPostHateFlags(hateFlag2.postId, hateFlag2);
    await setPostHateFlags(hateFlag3.postId, hateFlag3);

    await expect(
      getPostHateFlagsList([hateFlag1.postId, hateFlag2.postId]),
    ).resolves.toEqual([hateFlag1, hateFlag2]);
  });

  it("deletes all hate flags without deleting other storage data", async () => {
    await setPostHateFlags(hateFlag1.postId, hateFlag1);
    await setPostHateFlags(hateFlag2.postId, hateFlag2);
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
    await setPostHateFlags(hateFlag1.postId, hateFlag1);
    await setPostHateFlags(hateFlag2.postId, hateFlag2);

    await deletePostHateFlags(hateFlag1.postId);

    await expect(getPostHateFlags(hateFlag1.postId)).resolves.toEqual({
      postId: hateFlag1.postId,
      hateFlags: {},
    });
    await expect(getPostHateFlags(hateFlag2.postId)).resolves.toEqual(
      hateFlag2,
    );
  });

  it("deletes hate flags for the given post list only", async () => {
    await setPostHateFlags(hateFlag1.postId, hateFlag1);
    await setPostHateFlags(hateFlag2.postId, hateFlag2);
    await setPostHateFlags(hateFlag3.postId, hateFlag3);

    await deletePostHateFlagsList([hateFlag1.postId, hateFlag3.postId]);

    await expect(getPostHateFlags(hateFlag1.postId)).resolves.toEqual({
      postId: hateFlag1.postId,
      hateFlags: {},
    });
    await expect(getPostHateFlags(hateFlag2.postId)).resolves.toEqual(
      hateFlag2,
    );
    await expect(getPostHateFlags(hateFlag3.postId)).resolves.toEqual({
      postId: hateFlag3.postId,
      hateFlags: {},
    });
  });

  it("add first comment flag to true", async () => {
    await updateCommentHateFlags("postId", [
      { textContent: "textContent1", isFlagged: true },
    ]);

    const postHateFlags = await getPostHateFlags("postId");
    expect(postHateFlags.postId).toEqual("postId");
    expect(Object.keys(postHateFlags.hateFlags)).toHaveLength(1);
    expect(
      postHateFlags.hateFlags[
        await commentHateFlagKey("textContent1")
      ],
    ).toEqual(true);
  });

  it("add first comment flag to false", async () => {
    await updateCommentHateFlags("postId", [
      { textContent: "textContent1", isFlagged: false },
    ]);

    const postHateFlags = await getPostHateFlags("postId");
    expect(postHateFlags.postId).toEqual("postId");
    expect(Object.keys(postHateFlags.hateFlags)).toHaveLength(1);
    expect(
      postHateFlags.hateFlags[
        await commentHateFlagKey("textContent1")
      ],
    ).toEqual(false);
  });

  it("update comment flag for existing comment", async () => {
    await setPostHateFlags("postId", {
      postId: "postId",
      hateFlags: {
        [await commentHateFlagKey("textContent1")]: false,
      },
    });

    await updateCommentHateFlags("postId", [
      { textContent: "textContent1", isFlagged: true },
    ]);

    const postHateFlags = await getPostHateFlags("postId");
    expect(Object.keys(postHateFlags.hateFlags)).toHaveLength(1);
    expect(
      postHateFlags.hateFlags[
        await commentHateFlagKey("textContent1")
      ],
    ).toEqual(true);
  });

  it("update comment flags for the given comments only", async () => {
    await setPostHateFlags("postId", {
      postId: "postId",
      hateFlags: {
        [await commentHateFlagKey("textContent1")]: false,
        [await commentHateFlagKey("textContent2")]: false,
        [await commentHateFlagKey("textContent3")]: false,
      },
    });

    await updateCommentHateFlags("postId", [
      { textContent: "textContent1", isFlagged: true },
      { textContent: "textContent2", isFlagged: true },
    ]);

    const postHateFlags = await getPostHateFlags("postId");
    expect(Object.keys(postHateFlags.hateFlags)).toHaveLength(3);
    expect(
      postHateFlags.hateFlags[
        await commentHateFlagKey("textContent1")
      ],
    ).toEqual(true);
    expect(
      postHateFlags.hateFlags[
        await commentHateFlagKey("textContent2")
      ],
    ).toEqual(true);
    expect(
      postHateFlags.hateFlags[
        await commentHateFlagKey("textContent3")
      ],
    ).toEqual(false);
  });
});
