import {
  SCS_GET_PAGE_INFO_MESSAGE,
  SCS_SCRAP_TAB_MESSAGE,
  ScsPageInfoMessage,
  ScsScrapTabMessage,
} from "./messages";
import { ScrapTabResult } from "./ScrapTabResult";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";

/**
 * Client to communicate with content script in a specific tabId.
 * This client also handles cases where there is no content script running in this tab
 */
export class ScrapingContentScriptClient {
  constructor(private readonly tabId: number) {}

  /**
   * Get information on a social network page
   */
  async getTabSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    const response = await this.safeSendMessage<
      ScsPageInfoMessage,
      SocialNetworkPageInfo
    >(SCS_GET_PAGE_INFO_MESSAGE);
    if (response === NO_CONTENT_SCRIPT) {
      // undefined response means  Content script for url
      console.debug("No content script in tab " + this.tabId);
      return {
        isScrapablePost: false,
      };
    }
    return response;
  }

  async scrapPost(): Promise<ScrapTabResult> {
    const response = await this.safeSendMessage<
      ScsScrapTabMessage,
      ScrapTabResult
    >(SCS_SCRAP_TAB_MESSAGE);
    if (response === NO_CONTENT_SCRIPT) {
      // No Scraping Content script registered for this url
      return {
        type: "error",
        message: "No Scraping Content script registered for this url",
      };
    }
    return response;
  }

  private async safeSendMessage<M, R>(
    message: M,
  ): Promise<R | typeof NO_CONTENT_SCRIPT> {
    try {
      return await browser.tabs.sendMessage<M, R>(this.tabId, message);
    } catch (e) {
      if (
        String(e).includes(
          "Error: Could not establish connection. Receiving end does not exist.",
        )
      ) {
        console.debug("No content  script listening in tab " + this.tabId);
        return NO_CONTENT_SCRIPT;
      }
      throw e;
    }
  }
}

const NO_CONTENT_SCRIPT = "NO_CONTENT_SCRIPT" as const;
