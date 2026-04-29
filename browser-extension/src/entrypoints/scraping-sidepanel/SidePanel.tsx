import { Spinner } from "@/components/ui/spinner";
import { DisplayTabNotScrapable } from "./DisplayTabNotScrapable";
import { DisplayScrapingNotStarted } from "./scraping/DisplayScrapingNotStarted";
import { DisplayScrapingNotStartedWithExistingSnapshot } from "./scraping/DisplayScrapingNotStartedWithExistingSnapshot";
import { DisplayScrapingInProgress } from "./scraping/DisplayScrapingInProgress";
import { DisplayScrapingFailed } from "./scraping/DisplayScrapingFailed";
import { DisplayScrapingCanceled } from "./scraping/DisplayScrapingCanceled";
import { DisplayClassificationInProgress } from "./classification/DisplayClassificationInProgress";
import { DisplayClassificationSucceeded } from "./classification/DisplayClassificationSucceeded";
import { DisplayClassificationFailed } from "./classification/DisplayClassificationFailed";
import {
  ScrapingAndClassificationTabInfoType,
  TabInfoClassificationFailed,
  TabInfoClassificationInProgess,
  TabInfoClassificationSucceeded,
  TabInfoNotScrapableTab,
  TabInfoScrapingCanceled,
  TabInfoScrapingFailed,
  TabInfoScrapingInProgress,
  TabInfoScrapingNotStarted,
  TabInfoScrapingNotStartedWithExistingSnapshot,
  useScrapingAndClassificationTabInfo,
} from "./useScrapingAndClassificationTabInfo";
import { getTabIdFromSidePanelUrl } from "./side-panel-url";
import {
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "./SidePanelLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

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
        <SidePanelLayout>
          <SidePanelHeader>
            <SidePanelTitle>Erreur inattendue</SidePanelTitle>
          </SidePanelHeader>
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{queryError.message}</AlertDescription>
          </Alert>
        </SidePanelLayout>
      </>
    );
  }
  if (
    isPending ||
    tabInfo.type === ScrapingAndClassificationTabInfoType.NO_TAB
  ) {
    return (
      <SidePanelLayout>
        <Spinner className="m-auto size-8" />;
      </SidePanelLayout>
    );
  }

  return <SidePanelContent tabInfo={tabInfo} />;
}
export function SidePanelContent({
  tabInfo,
}: {
  tabInfo:
    | TabInfoScrapingNotStarted
    | TabInfoScrapingNotStartedWithExistingSnapshot
    | TabInfoNotScrapableTab
    | TabInfoScrapingInProgress
    | TabInfoScrapingFailed
    | TabInfoScrapingCanceled
    | TabInfoClassificationInProgess
    | TabInfoClassificationSucceeded
    | TabInfoClassificationFailed;
}) {
  switch (tabInfo.type) {
    case ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE:
      return <DisplayTabNotScrapable />;
    case ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED:
      return <DisplayScrapingNotStarted tabInfo={tabInfo} />;
    case ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED_WITH_EXISTING_SNAPSHOT:
      return (
        <DisplayScrapingNotStartedWithExistingSnapshot tabInfo={tabInfo} />
      );
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
