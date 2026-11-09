import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";

export function extractInstagramCommentsCount(
  scrapingSupport: ScrapingSupport,
  parent: ParentNode,
): number {
  const commentIcon = scrapingSupport.selectOrThrow(
    parent,
    "svg[aria-label='Commenter'], svg[aria-label='Comment']",
    SVGSVGElement,
    { selectedElementDescriptor: "commentIcon" },
  );
  const actionsBar =
    commentIcon.parentElement?.parentElement?.parentElement?.parentElement;
  if (!actionsBar) {
    throw new Error("Failed to find Instagram action bar");
  }

  const countElement = scrapingSupport.selectOrThrow(
    actionsBar,
    ":scope > span:nth-of-type(4)",
    HTMLSpanElement,
    { selectedElementDescriptor: "commentsCount" },
  );

  return parseInstagramCompactCount(countElement.innerText);
}

export function parseInstagramCompactCount(value: string): number {
  // Instagram abbreviates large action-bar counts. This is a progress estimate,
  // not an exact post statistic.
  const compactMatch = /^\s*(\d+(?:[.,]\d+)?)\s*([KM])\s*$/i.exec(value);
  if (compactMatch) {
    const amount = Number.parseFloat(compactMatch[1]!.replace(",", "."));
    const multiplier =
      compactMatch[2]!.toUpperCase() === "M" ? 1_000_000 : 1_000;
    return Math.round(amount * multiplier);
  }

  if (!/^\s*[0-9][0-9,.\s]*\s*$/.test(value)) {
    throw new Error(`Invalid Instagram count: ${value}`);
  }

  return Number.parseInt(value.replaceAll(/[,.\s]/g, ""), 10);
}
