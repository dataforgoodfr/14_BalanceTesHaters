import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { Button } from "@/components/ui/button";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";
import { TabInfoScrapingInProgress } from "./useScrapingAndClassificationTabInfo";
import WorkInProgress from "../posts/WorkInProgress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function DisplayScrapingInProgress({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingInProgress;
}) {
  const scrapingProgress =
    tabInfo.scrapingStatus.type === "running"
      ? tabInfo.scrapingStatus.progress
      : 0;
  return (
    <>
      <WorkInProgress />{" "}
      <div className="flex flex-col gap-2">
        <h2>Analyse en cours (1/2) </h2>

        <Progress value={scrapingProgress} />

        <Alert variant="destructive" className="max-w-md">
          <AlertCircleIcon />
          <AlertTitle>Attention: Capture des commentaires en cours.</AlertTitle>
          <AlertDescription>
            Evite de cliquer sur la page ou de faire défiler la page.
          </AlertDescription>
        </Alert>

        <Button
          data-testid="cancel-scraping-button"
          className="w-full"
          variant="destructive"
          onClick={() =>
            void new ScrapingContentScriptClient(tabInfo.tabId).cancelScraping()
          }
        >
          Arrêter l&apos;analyse
        </Button>
        <ViewPreviousAnalysesButton disabled={true} />
      </div>
    </>
  );
}
