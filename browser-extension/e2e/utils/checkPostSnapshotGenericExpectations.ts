import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { expect } from "@playwright/test";

export function checkPostSnapshotGenericExpectations(
  postSnapshot: PostSnapshot,
) {
  expect(postSnapshot.id).toBeDefined();
  expect(postSnapshot.postId).toBeDefined();
  expect(postSnapshot.url).toBeDefined();
  expect(postSnapshot.coverImageUrl).toBeDefined();
  expect(postSnapshot.author).toBeDefined();
  expect(postSnapshot.author.name).toBeDefined();
  expect(postSnapshot.author.accountHref).toBeDefined();
  expect(postSnapshot.publishedAt.type).toBe("absolute");
  if (postSnapshot.publishedAt.type === "absolute") {
    expect(new Date(postSnapshot.publishedAt.date).getTime()).toBeLessThan(
      Date.now(),
    );
  }
  expect(new Date(postSnapshot.scrapedAt).getTime()).toBeLessThan(Date.now());
}
