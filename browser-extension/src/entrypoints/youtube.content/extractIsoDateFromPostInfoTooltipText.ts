import { parse } from "date-fns";
import { enUS, fr } from "date-fns/locale";

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
  const dateFragment = fragments[1];

  const date = parseDateFragment(dateFragment);

  if (isNaN(date.getTime())) {
    throw new Error(
      "Cannot parse tooltip - date fragment is invalid: " + tooltipText,
    );
  }
  const localDate = new Date(date.getTime());
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

function parseDateFragment(dateFragment: string): Date {
  const parseConfigs = [
    { locale: enUS, format: "MMM dd, yyyy" },
    { locale: fr, format: "dd MMMM yyyy" },
  ];
  for (const parseConfig of parseConfigs) {
    const referenceDate = new Date();
    const date = parse(dateFragment.trim(), parseConfig.format, referenceDate, {
      locale: parseConfig.locale,
    });
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date(NaN);
}
