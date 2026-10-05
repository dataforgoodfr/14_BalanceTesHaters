export interface SubmitClassificationRequestMessage {
  msgType: "submit-classification-request";
  postSnapshotId: string;
  allowResubmit?: boolean;
}

export async function sendSubmitClassificationRequestMessage(
  postSnapshotId: string,
  allowResubmit: boolean = false,
): Promise<{ success: boolean }> {
  const message: SubmitClassificationRequestMessage = {
    msgType: "submit-classification-request",
    postSnapshotId: postSnapshotId,
    ...(allowResubmit ? { allowResubmit: true } : {}),
  };
  return await browser.runtime.sendMessage<
    SubmitClassificationRequestMessage,
    { success: boolean }
  >(message);
}

export function isSubmitClassificationRequestMessage(
  message: unknown,
): message is SubmitClassificationRequestMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "msgType" in message &&
    message.msgType === "submit-classification-request" &&
    "postSnapshotId" in message &&
    typeof message.postSnapshotId === "string" &&
    (!("allowResubmit" in message) ||
      typeof message.allowResubmit === "boolean")
  );
}
