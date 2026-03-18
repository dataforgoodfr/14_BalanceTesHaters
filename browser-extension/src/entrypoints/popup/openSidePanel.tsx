import { sidePanelUrl } from "../scraping-sidepanel/side-panel-url";

export async function openSidePanel(tabId: number): Promise<void> {
  await browser.sidePanel.setOptions({
    tabId: tabId,
    path: sidePanelUrl(tabId),
    enabled: true,
  });
  await browser.sidePanel.open({
    tabId: tabId,
  });
}
