import { Spinner } from "@/components/ui/spinner";
import { DisplayTabNotScrapable } from "./DisplayTabNotScrapable";
import { DisplayScrapingNotStarted } from "./DisplayScrapingNotStarted";
import { DisplayScrapingInProgress } from "./DisplayScrapingInProgress";
import { DisplayScrapingFailed } from "./DisplayScrapingFailed";
import { DisplayScrapingCanceled } from "./DisplayScrapingCanceled";
import { DisplayClassificationInProgress } from "./DisplayClassificationInProgress";
import { DisplayClassificationSucceeded } from "./DisplayClassificationSucceeded";
import { DisplayClassificationFailed } from "./DisplayClassificationFailed";
import { useScrapingAndClassificationTabInfo } from "../popup/useScrapingAndClassificationTabInfo";

export function SidePanel() {
  const {
    isPending,
    error: queryError,
    data: tabInfo,
  } = useScrapingAndClassificationTabInfo();

  if (queryError) {
    return (
      <>
        <h2>Oops! An error occured</h2>
        <p>{queryError.message}</p>
      </>
    );
  }
  if (isPending || tabInfo.type === "no-tab") {
    return <Spinner className="m-auto size-8" />;
  }

  switch (tabInfo.type) {
    case "not-scrapable":
      return <DisplayTabNotScrapable />;
    case "scraping-not-started":
      return <DisplayScrapingNotStarted tabInfo={tabInfo} />;
    case "scraping-in-progress":
      return <DisplayScrapingInProgress tabInfo={tabInfo} />;
    case "scraping-failed":
      return <DisplayScrapingFailed tabInfo={tabInfo} />;
    case "scraping-canceled":
      return <DisplayScrapingCanceled tabInfo={tabInfo} />;
    case "classification-in-progress":
      return <DisplayClassificationInProgress tabInfo={tabInfo} />;
    case "classification-succeeded":
      return <DisplayClassificationSucceeded tabInfo={tabInfo} />;
    case "classification-failed":
      return <DisplayClassificationFailed tabInfo={tabInfo} />;
  }
}
