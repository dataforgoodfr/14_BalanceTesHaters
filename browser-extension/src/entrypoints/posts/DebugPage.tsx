import { Button } from "@/components/ui/button";
import { STORAGE_KEY_DEBUG_FP_SCREENSHOT_DATAURL } from "@/shared/native-screenshoting/cs/page-screenshot";

function downloadLatestFullPageScreenshot() {
  console.log("Downloading latestFullPageScreenshot");
  browser.storage.local
    .get(STORAGE_KEY_DEBUG_FP_SCREENSHOT_DATAURL)
    .then((partial) => {
      const dataUrl = partial[
        STORAGE_KEY_DEBUG_FP_SCREENSHOT_DATAURL
      ] as string;
      browser.downloads.download({
        url: dataUrl,
        filename: "screenshot.png",
      });
    });
}

export function DebugPage() {
  return (
    <Button onClick={() => downloadLatestFullPageScreenshot()}>
      Download debug full page screenshot
    </Button>
  );
}
