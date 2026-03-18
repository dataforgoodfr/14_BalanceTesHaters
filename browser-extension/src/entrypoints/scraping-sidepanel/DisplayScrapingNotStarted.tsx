import { Button } from "@/components/ui/button";
import { TabInfoScrapingNotStarted } from "./useScrapingAndClassificationTabInfo";
import { startScraping } from "./startScraping";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";
import WorkInProgress from "../posts/WorkInProgress";

export function DisplayScrapingNotStarted({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingNotStarted;
}) {
  return (
    <>
      <WorkInProgress />
      <div className="flex flex-col gap-2">
        <h2>Prêt à analyser</h2>
        <p>
          Vous êtes sur une publication {tabInfo.pageInfo.socialNetwork}{" "}
          analysable.
        </p>
        <Button
          data-testid="retry-scraping-button"
          className="w-full"
          onClick={() => startScraping(tabInfo.tabId)}
        >
          Démarrer l&apos;analyse
        </Button>
        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
