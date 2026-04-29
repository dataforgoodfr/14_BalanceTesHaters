export interface UpdatePostWithClassificationResultMessage {
  msgType: "update-post-classification";
  postSnapshotId: string;
}

export async function sendUpdatePostWithClassificationResultMessage(
  postSnapshotId: string,
): Promise<{ success: boolean }> {
  const message: UpdatePostWithClassificationResultMessage = {
    msgType: "update-post-classification",
    postSnapshotId: postSnapshotId,
  };
  return await browser.runtime.sendMessage<
    UpdatePostWithClassificationResultMessage,
    { success: boolean }
  >(message);
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
