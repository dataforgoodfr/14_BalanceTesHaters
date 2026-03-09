/**
 *  Extract iso date out of youtube video tooltip text that looks like this
 *  "20 330 vues • 18 janv. 2026 • #iran #golshiftehfarahani #arte"
 * @param tooltipText
 */
export function extractIsoDateFromPostInfoTooltipText(
  tooltipText: string,
): string {
  const fragments = tooltipText.split("•");
  if (fragments.length < 2) {
    throw new Error("Cannot parse tooltip - missing fragments: " + tooltipText);
  }
  const dateAsString = fragments[1];

  const timestamp = Date.parse(dateAsString);
  if (isNaN(timestamp)) {
    throw new Error(
      "Cannot parse tooltip - date fragment is invalid: " + tooltipText,
    );
  }
  const localDate = new Date(timestamp);
  // Date in youtube don't have a time so just assume it's for midnight utc
  const forcedAsMidnightUTC = new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
    ),
  );
  return forcedAsMidnightUTC.toISOString();
}
