import { WxtBrowser } from "wxt/browser";
import { sidePanelUrl } from "../scraping-sidepanel/side-panel-url";

type SideBarActionBrowser = {
  sidebarAction: {
    setPanel(options: { tabId: number; panel: string }): Promise<void>;
    open(): Promise<void>;
  };
} & WxtBrowser;

export async function openSidePanel(tabId: number): Promise<void> {
  if ("sidePanel" in browser) {
    const path = sidePanelUrl(tabId);
    await browser.sidePanel.setOptions({
      tabId: tabId,
      path: path,
      enabled: true,
    });
    await browser.sidePanel.open({
      tabId: tabId,
    });
  } else if ("sidebarAction" in browser) {
    const sbaBrowser = browser as SideBarActionBrowser;
    const path = sidePanelUrl(tabId);
    const panelUrl = sbaBrowser.runtime.getURL(path);

    await sbaBrowser.sidebarAction.open();
    await sbaBrowser.sidebarAction.setPanel({ tabId, panel: panelUrl });
  }
}
