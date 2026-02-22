export interface UpdatePostWithClassificationResultMessage {
  msgType: "update-post-classification";
  postSnapshotId: string;
}

export function isUpdatePostWithClassificationResultMessage(
  message: unknown,
): message is UpdatePostWithClassificationResultMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "update-post-classification"
  );
}
