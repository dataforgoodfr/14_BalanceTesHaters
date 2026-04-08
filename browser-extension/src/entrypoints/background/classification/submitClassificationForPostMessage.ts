export interface SubmitClassificationRequestMessage {
  msgType: "submit-classification-request";
  postSnapshotId: string;
}

export async function sendSubmitClassificationRequestMessage(
  postSnapshotId: string,
): Promise<{ success: boolean }> {
  const message: SubmitClassificationRequestMessage = {
    msgType: "submit-classification-request",
    postSnapshotId: postSnapshotId,
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
    message.msgType === "submit-classification-request"
  );
}
