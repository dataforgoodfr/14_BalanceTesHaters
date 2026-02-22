export interface SubmitClassificationRequestMessage {
  msgType: "submit-classification-request";
  postSnapshotId: string;
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
