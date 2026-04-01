import { Button } from "@/components/ui/button";
import { TabInfoScrapingFailed } from "../useScrapingAndClassificationTabInfo";
import { startScraping } from "../startScraping";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, CircleAlertIcon, RotateCwIcon } from "lucide-react";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";

export function DisplayScrapingFailed({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingFailed;
}) {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <CircleAlertIcon />
          Échec de la capture
        </SidePanelTitle>
      </SidePanelHeader>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Une erreur inattendue s&apos;est produite.</AlertTitle>
        <AlertDescription>
          {tabInfo.scrapingStatus.errorMessage}
        </AlertDescription>
      </Alert>
      <SidePanelActions>
        <Button
          size="lg"
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => startScraping(tabInfo.tabId)}
        >
          <RotateCwIcon /> Réessayer
        </Button>
        <ViewPreviousAnalysesButton />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
