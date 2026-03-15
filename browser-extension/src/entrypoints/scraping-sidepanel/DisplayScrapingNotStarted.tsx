import { Button } from "@/components/ui/button";
import { TabInfoScrapingNotStarted } from "../popup/useScrapingAndClassificationTabInfo";
import { sendScrapMessage } from "../popup/sendScrapMessage";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";

export function DisplayScrapingNotStarted({
  tabInfo,
}: {
  tabInfo: TabInfoScrapingNotStarted;
}) {
  return (
    <>
      <h2>Prêt à analyser</h2>
      <p>
        Vous êtes sur une publication {tabInfo.pageInfo.socialNetwork}
        analyzable.
      </p>
      <Button
        data-testid="retry-scraping-button"
        className="w-full"
        onClick={() => sendScrapMessage(tabInfo.tabId)}
      >
        Démarrer l&apos;analyse
      </Button>
      <ViewPreviousAnalysesButton />
    </>
  );
}
