import { Button } from "@/components/ui/button";
import { TabInfoClassificationSucceeded } from "./useScrapingAndClassificationTabInfo";
import { startScraping } from "./startScraping";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";
import WorkInProgress from "../posts/WorkInProgress";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";

export function DisplayClassificationSucceeded({
  tabInfo,
}: {
  tabInfo: TabInfoClassificationSucceeded;
}) {
  return (
    <>
      <WorkInProgress />
      <div className="flex flex-col gap-2">
        <h2>Analyse terminée</h2>

        <Button
          data-testid="view-analysis-button"
          className="w-full"
          variant="default"
          render={
            <a
              href={postDetailUrl(
                tabInfo.pageInfo.socialNetwork,
                tabInfo.pageInfo.postId,
              )}
              target="bth-posts"
            >
              Voir l&apos;analyse de cette publications
            </a>
          }
        />

        <Button
          data-testid="start-scraping-button"
          className="w-full"
          variant="outline"
          onClick={() => startScraping(tabInfo.tabId)}
        >
          Lancer une nouvelle analyse
        </Button>

        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}

function postDetailUrl(
  socialNetwork: SocialNetworkName,
  postId: string,
): string {
  return browser.runtime.getURL(`/posts.html#posts/${socialNetwork}/${postId}`);
}
