export const TAB_SCREENSHOT_MSG = {
  type: "tab-screenshot",
};
export type TabScreenshotMessage = typeof TAB_SCREENSHOT_MSG;

export function isScreenshotSenderTab(
  message: unknown,
): message is TabScreenshotMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === TAB_SCREENSHOT_MSG.type
  );
}
