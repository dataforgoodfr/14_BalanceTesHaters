import { Post } from "@/shared/model/post";

/**
 * Message sent to background to start scraping the active tab
 */
export type ScrapActiveTabMessage = {
  msgType: "scrap-active-tab";
};

/**
 * Message sent to background to reprocess a post with the backend.
 */
export interface ReprocessPostMessage {
  msgType: "reprocess-post";
  post: Post;
}

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

export function isReprocessPostMessage(
  message: unknown,
): message is ReprocessPostMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "reprocess-post"
  );
}
