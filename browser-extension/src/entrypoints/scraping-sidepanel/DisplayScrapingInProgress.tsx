import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { Button } from "@/components/ui/button";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";
import { TabInfoScrapingInProgress } from "../popup/useScrapingAndClassificationTabInfo";
import { Progress } from "@/components/ui/progress";

export function DisplayScrapingInProgress({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingInProgress;
}) {
  const progress =
    tabInfo.scrapingStatus.type === "running"
      ? tabInfo.scrapingStatus.progress
      : 0;
  return (
    <>
      <h2>Analyse en cours (1/2) </h2>
      <p>
        Pendant la capture, évitez de cliquer, de redimensionner ou de faire
        défiler la page.
      </p>

      <Progress className="size-16 m-auto" value={progress} />

      <Button
        data-testid="cancel-scraping-button"
        className="w-full"
        variant="destructive"
        onClick={() =>
          new ScrapingContentScriptClient(tabInfo.tabId).cancelScraping()
        }
      >
        Arrêter l&apos;analyse
      </Button>
      <ViewPreviousAnalysesButton />
    </>
  );
}
