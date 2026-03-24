export function sidePanelUrl(tabId: number): string {
  return "scraping-sidepanel.html?tabId=" + tabId;
}

export function getTabIdFromSidePanelUrl(sidePanelUrl: string): number {
  const url = URL.parse(sidePanelUrl);
  const strTabId = url?.searchParams?.get("tabId");
  if (!strTabId) {
    throw new Error("Missing tabId parameter in url:" + sidePanelUrl);
  }
  return Number.parseInt(strTabId);
}
