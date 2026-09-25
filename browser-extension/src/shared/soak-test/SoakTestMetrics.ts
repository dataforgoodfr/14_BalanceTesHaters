import type {
  SoakControllerObservation,
  SoakControllerResult,
  SoakControllerStatus,
} from "./SoakTestProtocol";

export function refineSuccessStatus(
  expectedComments: number | undefined,
  scrapedComments: number | undefined,
): Extract<SoakControllerStatus, "success" | "warning"> {
  return expectedComments !== undefined &&
    scrapedComments !== undefined &&
    expectedComments !== scrapedComments
    ? "warning"
    : "success";
}

export function getAverageDurationPerCommentMs(
  result: SoakControllerResult,
): number | undefined {
  return result.scrapedComments === undefined || result.scrapedComments === 0
    ? undefined
    : result.durationMs / result.scrapedComments;
}

export function getLifecycleSummary(
  observation: SoakControllerObservation,
): string | undefined {
  const details: string[] = [];
  if (observation.pageVisibilityState) {
    details.push(`page ${observation.pageVisibilityState}`);
  }
  if (observation.documentHasFocus !== undefined) {
    details.push(
      observation.documentHasFocus ? "document focused" : "document unfocused",
    );
  }
  if (observation.tabActive !== undefined) {
    details.push(observation.tabActive ? "tab active" : "tab inactive");
  }
  if (observation.windowFocused !== undefined) {
    details.push(
      observation.windowFocused ? "window focused" : "window unfocused",
    );
  }
  if (observation.tabFrozen) details.push("tab frozen");
  if (observation.tabDiscarded) details.push("tab discarded");
  return details.length === 0 ? undefined : details.join(" · ");
}
