export interface SubmitClassificationRequestMessage {
  msgType: "submit-classification-request";
  postId: string;
  scrapedAt: string;
}

export function isSubmitClassificationRequestMessage(
  message: unknown,
): message is SubmitClassificationRequestMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "submit-classification-request"
  );
}
