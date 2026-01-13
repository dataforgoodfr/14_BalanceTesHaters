/**
 * Message sent to background to start scraping the active tab
 */
export type ScrapActiveTabMessage = {
  msgType: "scrap-active-tab";
};

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
