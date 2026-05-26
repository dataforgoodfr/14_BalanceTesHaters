import { describe, it, expect } from "vitest";
import {
  parseOgDescriptionContent,
  parseDateFragment,
  InstagramOgDescriptionInfo,
} from "../extractOgDescriptionInfo";

describe("parseDateFragment", () => {
  it("Should parse May 20, 2026 format correctly", () => {
    const result = parseDateFragment("May 20, 2026");
    expect(result).toBe("2026-05-20T00:00:00.000Z"); // May is month 5 (1-indexed in ISO string)
  });

  it("Should parse October 11, 2023 format correctly", () => {
    const result = parseDateFragment("October 11, 2023");
    expect(result).toBe("2023-10-11T00:00:00.000Z"); // October is month 10 (1-indexed in ISO string)
  });

  it("Should throw error for invalid format", () => {
    expect(() => parseDateFragment("invalid")).toThrow();
    expect(() => parseDateFragment("May 20")).toThrow();
    expect(() => parseDateFragment("May 20, 2026 extra")).toThrow();
  });

  it("Should throw error for unknown month", () => {
    expect(() => parseDateFragment("InvalidMonth 20, 2026")).toThrow();
  });

  it("Should throw error for invalid day", () => {
    expect(() => parseDateFragment("May invalid, 2026")).toThrow();
  });

  it("Should throw error for invalid year", () => {
    expect(() => parseDateFragment("May 20, invalid")).toThrow();
  });
});

describe("parseOgDescriptionContent", () => {
  it("general parsing", () => {
    const ogDescription =
      '572 likes, 130 comments - username le\u00A0 May 20, 2026: "Hello world".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe("Hello world");
    expect(result.publishedAt.type).toBe("absolute");
    expect(result.publishedAt.date).toBe("2026-05-20T00:00:00.000Z");
    expect(result.author).toEqual({
      name: "username",
      accountHref: "https://www.instagram.com/username",
    });
    expect(result.commentsCount).toBe(130);
  });

  it("general parsing handle traling white spaces", () => {
    const ogDescription =
      '572 likes, 130 comments - username le\u00A0 May 20, 2026: "Hello world".  \n ';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe("Hello world");
    expect(result.publishedAt.type).toBe("absolute");
    expect(result.publishedAt.date).toBe("2026-05-20T00:00:00.000Z");
    expect(result.author).toEqual({
      name: "username",
      accountHref: "https://www.instagram.com/username",
    });
    expect(result.commentsCount).toBe(130);
  });

  it("dateFragment with 'le' format (French)", () => {
    const ogDescription =
      '572 likes, 130 comments - username le\u00A0 May 20, 2026: "Hello world".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.publishedAt.type).toBe("absolute");
    expect(result.publishedAt.date).toBe("2026-05-20T00:00:00.000Z");
  });

  it("dateFragment with 'on' format (English)", () => {
    const ogDescription =
      '572 likes, 130 comments - username on May 20, 2026: "Hello world".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);

    expect(result.publishedAt.type).toBe("absolute");
    expect(result.publishedAt.date).toBe("2026-05-20T00:00:00.000Z");
  });

  it("textContent: multiline", () => {
    const ogDescription =
      '100 likes, 5 comments - testuser on October 11, 2023: "It\'s a beautiful day!\nContinue on next line!!".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe(
      "It's a beautiful day!\nContinue on next line!!",
    );
    expect(result.publishedAt.type).toBe("absolute");
    expect(result.publishedAt.date).toBe("2023-10-11T00:00:00.000Z");
    expect(result.author).toEqual({
      name: "testuser",
      accountHref: "https://www.instagram.com/testuser",
    });
    expect(result.commentsCount).toBe(5);
  });

  it("textContent: handle : in text content", () => {
    const ogDescription =
      '100 likes, 5 comments - testuser on October 11, 2023: "Before : after".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe("Before : after");
  });

  it('textContent: handle " in text content', () => {
    const ogDescription =
      '100 likes, 5 comments - testuser on October 11, 2023: "Before " after".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe('Before " after');
  });

  it("textContent: handle missing text content", () => {
    const ogDescription = `20K likes, 130 comments - testuser le\u00A0 October 11, 2023`;
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe("");
    expect(result.author).toEqual({
      name: "testuser",
      accountHref: "https://www.instagram.com/testuser",
    });
    expect(result.commentsCount).toBe(130);
    expect(result.publishedAt.type).toBe("absolute");
    expect(result.publishedAt.date).toBe("2023-10-11T00:00:00.000Z");
  });

  it("likes: Should handle 16K likes", () => {
    const ogDescription =
      '16K likes, 130 comments - testuser on October 11, 2023: "textContent".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.textContent).toBe("textContent");
    expect(result.commentsCount).toBe(130);
  });

  it("commentCount: Should handle no separator", () => {
    const ogDescription =
      '100 likes, 130 comments - testuser on October 11, 2023: "textContent".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.commentsCount).toBe(130);
  });

  it("commentCount: Should handle comma thousand separator", () => {
    const ogDescription =
      '100 likes, 2,488 comments - testuser on October 11, 2023: "textContent".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.commentsCount).toBe(2488);
  });

  it("commentCount: Should parse zero comments count", () => {
    const ogDescription =
      '0 likes, 0 comments - username on May 20, 2026: "No engagement".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.commentsCount).toBe(0);
    expect(result.textContent).toBe("No engagement");
  });

  it("commentCount: Should parse single-digit comments count", () => {
    const ogDescription =
      '10 likes, 3 comments - username on May 20, 2026: "Few comments".';
    const result: InstagramOgDescriptionInfo =
      parseOgDescriptionContent(ogDescription);
    expect(result.commentsCount).toBe(3);
    expect(result.textContent).toBe("Few comments");
  });

  it("Should throw error for invalid og:description format", () => {
    expect(() => parseOgDescriptionContent("invalid format")).toThrow();
    expect(() => parseOgDescriptionContent("missing quotes")).toThrow();
    expect(() => parseOgDescriptionContent("missing colon")).toThrow();
  });

  const og = `710K likes, 4,195 comments - pubity on May 19, 2026: "🐈‍⬛

This cat walked into the ocean on her very first beach trip and immediately started swimming. Most cats refuse to even touch water because their coat absorbs it and weighs them down, which is why they avoid baths so hard. Breeds like Maine Coons, Turkish Vans and Bengals are the rare exceptions, with water-resistant fur built for paddling.

(@mr.selleck via Collab)

#cats #wholesome". `;
  it("Should parse", () => {
    expect(() => parseOgDescriptionContent(og)).not.toThrow();
  });
});
