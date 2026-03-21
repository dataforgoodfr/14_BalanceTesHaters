import { Spinner } from "@/components/ui/spinner";
import { DisplayTabNotScrapable } from "./DisplayTabNotScrapable";
import { DisplayScrapingNotStarted } from "./DisplayScrapingNotStarted";
import { DisplayScrapingInProgress } from "./DisplayScrapingInProgress";
import { DisplayScrapingFailed } from "./DisplayScrapingFailed";
import { DisplayScrapingCanceled } from "./DisplayScrapingCanceled";
import { DisplayClassificationInProgress } from "./DisplayClassificationInProgress";
import { DisplayClassificationSucceeded } from "./DisplayClassificationSucceeded";
import { DisplayClassificationFailed } from "./DisplayClassificationFailed";
import {
  ScrapingAndClassificationTabInfoType,
  useScrapingAndClassificationTabInfo,
} from "./useScrapingAndClassificationTabInfo";
import { getTabIdFromSidePanelUrl } from "./side-panel-url";

export function SidePanel() {
  const tabId = getTabIdFromSidePanelUrl(document.URL);
  const {
    isPending,
    error: queryError,
    data: tabInfo,
  } = useScrapingAndClassificationTabInfo(tabId);

  if (queryError) {
    return (
      <>
        <h2>Erreur inattendue</h2>
        <p>{queryError.message}</p>
      </>
    );
  }
  if (
    isPending ||
    tabInfo.type === ScrapingAndClassificationTabInfoType.NO_TAB
  ) {
    return <Spinner className="m-auto size-8" />;
  }

  switch (tabInfo.type) {
    case ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE:
      return <DisplayTabNotScrapable />;
    case ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED:
      return <DisplayScrapingNotStarted tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.SCRAPING_IN_PROGRESS:
      return <DisplayScrapingInProgress tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.SCRAPING_FAILED:
      return <DisplayScrapingFailed tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.SCRAPING_CANCELED:
      return <DisplayScrapingCanceled tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.CLASSIFICATION_IN_PROGRESS:
      return <DisplayClassificationInProgress tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.CLASSIFICATION_SUCCEEDED:
      return <DisplayClassificationSucceeded tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.CLASSIFICATION_FAILED:
      return <DisplayClassificationFailed tabInfo={tabInfo} />;
  }
}
