import { Button } from "@/components/ui/button";
import { TabInfoClassificationSucceeded } from "../popup/useScrapingAndClassificationTabInfo";
import { sendScrapMessage } from "../popup/sendScrapMessage";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";

export function DisplayClassificationSucceeded({
  tabInfo,
}: {
  tabInfo: TabInfoClassificationSucceeded;
}) {
  return (
    <>
      <h2>Capture annulée.</h2>
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
