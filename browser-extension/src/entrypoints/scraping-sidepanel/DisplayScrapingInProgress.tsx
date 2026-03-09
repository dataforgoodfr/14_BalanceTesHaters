import { Spinner } from "@/components/ui/spinner";
import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { Button } from "@/components/ui/button";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";
import { TabInfoScrapingInProgress } from "../popup/useScrapingAndClassificationTabInfo";

export function DisplayScrapingInProgress({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingInProgress;
}) {
  return (
    <>
      <h2>Analyse en cours (1/2) </h2>
      <p>
        Pendant la capture, évitez de cliquer, de redimensionner ou de faire
        défiler la page.
      </p>

      <Spinner className="size-16 m-auto" />

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
