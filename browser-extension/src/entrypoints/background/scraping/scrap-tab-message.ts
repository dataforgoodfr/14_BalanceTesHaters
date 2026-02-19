/**
 * Message sent to background to start scraping the active tab
 */
export type ScrapTabMessage = {
  msgType: "scrap-tab";
  tabId: number;
};

/**
 * Message sent to background to reprocess a post with the backend.
 */

export function isScrapTabMessage(
  message: unknown,
): message is ScrapTabMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "scrap-tab"
  );
}
