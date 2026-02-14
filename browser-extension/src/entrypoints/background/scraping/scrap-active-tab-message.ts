/**
 * Message sent to background to start scraping the active tab
 */
export type ScrapActiveTabMessage = {
  msgType: "scrap-active-tab";
};

/**
 * Message sent to background to reprocess a post with the backend.
 */

export function isScrapActiveTabMessage(
  message: unknown,
): message is ScrapActiveTabMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "scrap-active-tab"
  );
}
