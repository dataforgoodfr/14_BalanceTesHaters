// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  extractInstagramCommentsCount,
  parseInstagramCompactCount,
} from "../extractInstagramCommentsCount";

describe("extractInstagramCommentsCount", () => {
  const scrapingSupport = new ScrapingSupport(new AbortController().signal);

  it.each(["Comment", "Commenter"])(
    "extracts the count from the action bar containing the %s button",
    (commentLabel) => {
      document.body.innerHTML = `<section>
        <div id="actions-bar">
          <span><div role="button"><div><svg aria-label="Like"></svg></div></div></span>
          <span role="button">589</span>
          <span><div role="button"><div><svg aria-label="${commentLabel}"></svg></div></div></span>
          <span role="button">2,488</span>
        </div>
      </section>`;

      expect(extractInstagramCommentsCount(scrapingSupport, document)).toBe(
        2488,
      );
    },
  );
});

describe("parseInstagramCompactCount", () => {
  it.each([
    ["999", 999],
    ["2,488", 2488],
    ["1.7K", 1700],
    ["1,7 K", 1700],
    ["12K", 12000],
    ["1.2M", 1200000],
    ["1,2 M", 1200000],
  ])("parses %s as %i", (value, expected) => {
    expect(parseInstagramCompactCount(value)).toBe(expected);
  });

  it("rejects an invalid count", () => {
    expect(() => parseInstagramCompactCount("many")).toThrow(
      "Invalid Instagram count",
    );
  });
});
