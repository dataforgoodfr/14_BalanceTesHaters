import {
  SCS_GET_PAGE_INFO_MESSAGE,
  SCS_SCRAP_TAB_MESSAGE,
  SCS_GET_SCRAPING_STATUS_MESSAGE,
  SCS_CANCEL_SCRAP_TAB_MESSAGE,
  ScsPageInfoMessage,
  ScsScrapTabMessage,
  ScsGetScrapingStatusMessage,
  ScsCancelScrapTabMessage,
} from "./messages";
import { StartScrapingResult } from "./StartScrapingResult";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { ScrapingStatus } from "./ScrapingStatus";
import { matchesScrapingContentScriptUrl } from "./content-script-matches";

/**
 * Client to communicate with content script in a specific tabId.
 * This client also handles cases where there is no content script running in this tab
 */
export class ScrapingContentScriptClient {
  constructor(private readonly tabId: number) {}

  /**
   * Get information on a social network page
   */
  async getTabSocialNetworkPageInfo(): Promise<
    SocialNetworkPageInfo | typeof CONTENT_SCRIPT_LOADING
  > {
    if (!(await this.isContentScriptRegisteredForTabUrl())) {
      console.debug("No content script in tab " + this.tabId);
      return {
        isScrapablePost: false,
      };
    }
    const response = await this.safeSendMessage<
      ScsPageInfoMessage,
      SocialNetworkPageInfo
    >(SCS_GET_PAGE_INFO_MESSAGE);
    if (response === CONTENT_SCRIPT_NOT_RESPONDING) {
      console.debug("Content script loading");
      return CONTENT_SCRIPT_LOADING;
    }
    return response;
  }

  async startScraping(): Promise<StartScrapingResult> {
    const response = await this.safeSendMessage<
      ScsScrapTabMessage,
      StartScrapingResult
    >(SCS_SCRAP_TAB_MESSAGE);
    if (response === CONTENT_SCRIPT_NOT_RESPONDING) {
      return {
        type: "failed",
        errorMessage: "Content script not responding",
      };
    }
    return response;
  }

  /**
   * Get the current scraping status for this tab
   */
  async getScrapingStatus(): Promise<ScrapingStatus> {
    const response = await this.safeSendMessage<
      ScsGetScrapingStatusMessage,
      ScrapingStatus
    >(SCS_GET_SCRAPING_STATUS_MESSAGE);
    if (response === CONTENT_SCRIPT_NOT_RESPONDING) {
      // Tab does not have a scraping content script
      return Promise.reject(new Error("Content script not responding"));
    }
    return response;
  }

  /**
   * Cancel the currently running scraping operation for this tab
   */
  async cancelScraping(): Promise<void> {
    const response = await this.safeSendMessage<ScsCancelScrapTabMessage, null>(
      SCS_CANCEL_SCRAP_TAB_MESSAGE,
    );
    if (response === CONTENT_SCRIPT_NOT_RESPONDING) {
      throw new Error("Content script not responding");
    }
  }

  private async safeSendMessage<M, R>(
    message: M,
  ): Promise<R | typeof CONTENT_SCRIPT_NOT_RESPONDING> {
    try {
      return await browser.tabs.sendMessage<M, R>(this.tabId, message);
    } catch (e) {
      if (
        String(e).includes(
          "Error: Could not establish connection. Receiving end does not exist.",
        )
      ) {
        console.debug("Content script not responding in tab " + this.tabId);
        return CONTENT_SCRIPT_NOT_RESPONDING;
      }
      throw e;
    }
  }

  private async isContentScriptRegisteredForTabUrl(): Promise<boolean> {
    const tab = await browser.tabs.get(this.tabId);
    return matchesScrapingContentScriptUrl(tab.url);
  }
}

const CONTENT_SCRIPT_NOT_RESPONDING = "NO_CONTENT_SCRIPT" as const;
export const CONTENT_SCRIPT_LOADING = "CONTENT_SCRIPT_LOADING" as const;
