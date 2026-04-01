import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { Button } from "@/components/ui/button";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import { TabInfoScrapingInProgress } from "../useScrapingAndClassificationTabInfo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, XIcon } from "lucide-react";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";
import { BthCustomSpinner } from "../../../components/shared/BthSpinner";
import { Progress } from "@/components/ui/progress";

export function DisplayScrapingInProgress({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingInProgress;
}) {
  const progressValue =
    tabInfo.scrapingStatus.type === "running"
      ? tabInfo.scrapingStatus.progress / 2
      : 0;
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <BthCustomSpinner />
          Analyse en cours (1/2)
        </SidePanelTitle>
        <Progress title="Progrès de l'Analyse" value={progressValue} />
      </SidePanelHeader>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Attention: Capture des commentaires en cours.</AlertTitle>
        <AlertDescription>
          Evite de cliquer sur la page ou de faire défiler la page.
        </AlertDescription>
      </Alert>
      <SidePanelActions>
        <Button
          size="lg"
          data-testid="cancel-scraping-button"
          className="w-full"
          variant="destructive"
          onClick={() =>
            void new ScrapingContentScriptClient(tabInfo.tabId).cancelScraping()
          }
        >
          <XIcon />
          Arrêter l&apos;analyse
        </Button>
        <ViewPreviousAnalysesButton disabled={true} />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
