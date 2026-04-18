import { Button } from "@/components/ui/button";
import { TabInfoScrapingCanceled } from "../useScrapingAndClassificationTabInfo";
import { startScraping } from "../startScraping";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DisplayScrapingCanceled({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingCanceled;
}) {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <AlertCircleIcon /> Capture annulée
        </SidePanelTitle>
      </SidePanelHeader>
      <Alert className="max-w-md">
        <AlertCircleIcon />
        <AlertDescription>La capture a bien été arrêtée</AlertDescription>
      </Alert>
      <SidePanelActions>
        <Button
          size="lg"
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => {
            startScraping(tabInfo.tabId);
          }}
        >
          Relancer l&apos;analyse
        </Button>
        <ViewPreviousAnalysesButton />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
