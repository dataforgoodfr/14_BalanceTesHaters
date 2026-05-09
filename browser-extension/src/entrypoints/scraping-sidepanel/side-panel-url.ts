export function sidePanelUrl(
  tabId: number,
): `/scraping-sidepanel.html?tabId=${number}` {
  return `/scraping-sidepanel.html?tabId=${tabId}`;
}

export function getTabIdFromSidePanelUrl(
  sidePanelUrl: string,
): number | undefined {
  const url = URL.parse(sidePanelUrl);
  const strTabId = url?.searchParams?.get("tabId");
  if (!strTabId) {
    return undefined;
  }
  return Number.parseInt(strTabId);
}
