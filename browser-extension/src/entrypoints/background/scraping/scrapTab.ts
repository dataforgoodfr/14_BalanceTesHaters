import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { submitClassificationRequestForPost } from "../classification/submitClassificationForPost";

export async function scrapTabAndSubmitClassificationRequest(
  tabId: number,
): Promise<void> {
  console.debug(
    "scrapTabAndSubmitClassificationRequest - Scraping post from tabId",
    tabId,
  );

  const contentScriptClient = new ScrapingContentScriptClient(tabId);
  const result = await contentScriptClient.scrapPost();
  if (result.type === "succeeded") {
    await submitClassificationRequestForPost(result.postSnapshotId);
  } else if (result.type === "failed") {
    console.error("Scraping failed", result.errorMessage);
  } else if (result.type === "canceled") {
    console.error("Scraping canceled");
  }
}
