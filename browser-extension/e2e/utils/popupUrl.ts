export function popupUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/popup.html`;
}
export function popupUrlLinkedToTabId(
  extensionId: string,
  tabId: number,
): string {
  const url = URL.parse(popupUrl(extensionId));
  if (!url) {
    throw new Error("Invalid url");
  }
  url.hash = "#" + tabId;
  return url.toString();
}
