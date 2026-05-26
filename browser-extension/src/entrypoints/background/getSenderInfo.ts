const msgType = "get-sender-info";
export interface GetSenderInfoMessage {
  msgType: typeof msgType;
}
export type GetSenderInfoResult = {
  tabId?: number;
};

/**
 * Allows the web ext sender to know its tabId
 * @returns
 */
export async function sendGetSenderInfoMessage(): Promise<GetSenderInfoResult> {
  const message: GetSenderInfoMessage = {
    msgType: msgType,
  };
  return await browser.runtime.sendMessage<
    GetSenderInfoMessage,
    GetSenderInfoResult
  >(message);
}

export function isGetSenderInfoMessage(
  message: unknown,
): message is GetSenderInfoMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === msgType
  );
}
