export interface updatePostWithClassificationResultMessage {
  msgType: "update-post-classification";
  postId: string;
  scrapedAt: string;
}

export function isUpdatePostWithClassificationResultMessage(
  message: unknown,
): message is updatePostWithClassificationResultMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "update-post-classification"
  );
}
