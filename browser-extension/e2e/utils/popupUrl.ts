export function popupUrl(extensionId: string) {
  return `chrome-extension://${extensionId}/popup.html`;
}
export function popupUrlLinkedToTabUrl(extensionId: string, tabUrl: string) {
  return popupUrl(extensionId) + `#${tabUrl}`;
}
