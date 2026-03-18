import { Button } from "@/components/ui/button";
import { TabInfoScrapingFailed } from "./useScrapingAndClassificationTabInfo";
import { startScraping } from "./startScraping";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";
import WorkInProgress from "../posts/WorkInProgress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, RotateCwIcon } from "lucide-react";

export function DisplayScrapingFailed({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingFailed;
}) {
  return (
    <>
      <WorkInProgress />

      <div className="flex flex-col gap-2">
        <h2>Échec de la capture</h2>

        <Alert variant="destructive" className="max-w-md">
          <AlertCircleIcon />
          <AlertTitle>Une erreur inattendue c&apos;est produite.</AlertTitle>
          <AlertDescription>
            {tabInfo.scrapingStatus.errorMessage}
          </AlertDescription>
        </Alert>
        <Button
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => startScraping(tabInfo.tabId)}
        >
          <RotateCwIcon /> Réessayer
        </Button>

        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
