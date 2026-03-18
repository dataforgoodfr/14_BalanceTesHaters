import { Button } from "@/components/ui/button";
import { TabInfoScrapingCanceled } from "./useScrapingAndClassificationTabInfo";
import { startScraping } from "./startScraping";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";
import WorkInProgress from "../posts/WorkInProgress";

export function DisplayScrapingCanceled({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingCanceled;
}) {
  return (
    <>
      <WorkInProgress />
      <div className="flex flex-col gap-2">
        <h2>Capture annulée</h2>
        <Button
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => {
            startScraping(tabInfo.tabId);
          }}
        >
          Relancer l&apos;analyse
        </Button>
        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
