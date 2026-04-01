import { Button } from "@/components/ui/button";
import { TabInfoScrapingNotStarted } from "../useScrapingAndClassificationTabInfo";
import { startScraping } from "../startScraping";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";

export function DisplayScrapingNotStarted({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingNotStarted;
}) {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>Prêt à analyser</SidePanelTitle>
      </SidePanelHeader>
      <SidePanelActions>
        <Button
          size="lg"
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => startScraping(tabInfo.tabId)}
        >
          Lancer l&apos;analyse
        </Button>
      </SidePanelActions>
    </SidePanelLayout>
  );
}
