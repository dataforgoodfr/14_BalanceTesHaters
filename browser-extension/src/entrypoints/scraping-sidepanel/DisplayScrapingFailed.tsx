import { Button } from "@/components/ui/button";
import { TabInfoScrapingFailed } from "../popup/useScrapingAndClassificationTabInfo";
import { sendScrapMessage } from "../popup/sendScrapMessage";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";

export function DisplayScrapingFailed({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingFailed;
}) {
  return (
    <>
      <h2>Echec de la capture</h2>

      <pre>{tabInfo.scrapingStatus.errorMessage}</pre>
      <Button
        data-testid="retry-scraping-button"
        className="w-full"
        onClick={() => sendScrapMessage(tabInfo.tabId)}
      >
        Relancer l&apos;analyse
      </Button>

      <ViewPreviousAnalysesButton />
    </>
  );
}
