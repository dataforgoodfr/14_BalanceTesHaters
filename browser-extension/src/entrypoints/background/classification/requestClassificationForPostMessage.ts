export interface RequestClassificationMessage {
  msgType: "request-classification";
  postId: string;
  scrapedAt: string;
}

export function isRequestClassificationMessage(
  message: unknown,
): message is RequestClassificationMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "request-classification"
  );
}
