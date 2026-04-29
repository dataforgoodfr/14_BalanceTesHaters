import { Button } from "@/components/ui/button";
import { TabInfoScrapingNotStartedWithExistingSnapshot } from "../useScrapingAndClassificationTabInfo";
import { startScraping } from "../startScraping";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";
import { AlertCircleIcon, HistoryIcon, RotateCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DisplayScrapingNotStartedWithExistingSnapshot({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingNotStartedWithExistingSnapshot;
}) {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <HistoryIcon />
          Analyse existante
        </SidePanelTitle>
      </SidePanelHeader>
      <Alert className="max-w-md" variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>
          Attention: tu as déjà une analyse pour cette publication.
        </AlertTitle>
        <AlertDescription>
          Relancer l&apos;analyse mettra à jour l&apos;analyse existante.
        </AlertDescription>
      </Alert>
      <SidePanelActions>
        <Button
          size="lg"
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => startScraping(tabInfo.tabId)}
        >
          <RotateCwIcon /> Relancer l&apos;analyse
        </Button>
        <ViewPreviousAnalysesButton />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
