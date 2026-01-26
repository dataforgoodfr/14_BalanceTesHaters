export function isYoutubeScrapPostMessage(
  message: unknown,
): message is YoutubeScrapPostMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === CS_SCRAP_YT_POST.msgType
  );
}
/**
 * Message sent to youtube content script by background scraper to start native scraping
 */
export const CS_SCRAP_YT_POST = {
  msgType: "cs-scrap-youtube-post-message",
};

export type YoutubeScrapPostMessage = typeof CS_SCRAP_YT_POST;
