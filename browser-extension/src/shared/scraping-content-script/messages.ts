export type ScsPageInfoMessage = typeof SCS_GET_PAGE_INFO_MESSAGE;
export const SCS_GET_PAGE_INFO_MESSAGE = {
  msgType: "scs-get-page-info",
} as const;
export function isCsPageInfoMessage(
  message: unknown,
): message is ScsPageInfoMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === SCS_GET_PAGE_INFO_MESSAGE.msgType
  );
}

export const SCS_SCRAP_TAB_MESSAGE = {
  msgType: "scs-scrap-tab",
} as const;
export type ScsScrapTabMessage = typeof SCS_SCRAP_TAB_MESSAGE;

export function isCsScrapTabMessage(
  message: unknown,
): message is ScsScrapTabMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === SCS_SCRAP_TAB_MESSAGE.msgType
  );
}
