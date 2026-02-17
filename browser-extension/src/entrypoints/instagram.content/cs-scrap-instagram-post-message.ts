export function isInstagramScrapPostMessage(
  message: unknown,
): message is InstagramScrapPostMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === CS_SCRAP_INSTA_POST.msgType
  );
}
/**
 * Message sent to instagram content script by background scraper to start native scraping
 */
export const CS_SCRAP_INSTA_POST = {
  msgType: "cs-scrap-instagram-post-message",
};

export type InstagramScrapPostMessage = typeof CS_SCRAP_INSTA_POST;
