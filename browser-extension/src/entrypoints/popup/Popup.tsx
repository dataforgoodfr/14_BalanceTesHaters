import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ScrapingAndClassificationTabInfoType,
  useScrapingAndClassificationTabInfo,
} from "../scraping-sidepanel/useScrapingAndClassificationTabInfo";
import { startScraping } from "../scraping-sidepanel/startScraping";
import { ViewPreviousAnalysesButton } from "../scraping-sidepanel/ViewPreviousAnalysesButton";
import { openSidePanel } from "./openSidePanel";
import { Logo } from "./Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, InfoIcon } from "lucide-react";

export function Popup() {
  return (
    <div className="flex flex-col p-10 gap-8">
      <Logo className="mx-auto" />
      <PopupContent />
    </div>
  );
}

function PopupContent() {
  const [tabId, setTabId] = useState<number | undefined>(undefined);
  useEffect(() => {
    const parsedUrl = URL.parse(document.URL);
    const tabUrl = parsedUrl?.hash?.substring(1);
    const tabPromise = tabUrl ? queryTabWithUrl(tabUrl) : queryActiveTab();
    tabPromise.then((tab) => setTabId(tab?.id));
  });

  const {
    isPending,
    error: queryError,
    data: tabInfo,
  } = useScrapingAndClassificationTabInfo(tabId);

  if (queryError) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>
          Impossible de récupéréer les infos du tab courant.
        </AlertTitle>
        <AlertDescription>{queryError.message}</AlertDescription>
      </Alert>
    );
  }

  if (
    isPending ||
    tabInfo.type === ScrapingAndClassificationTabInfoType.NO_TAB
  ) {
    return <Spinner className="size-16 m-auto" />;
  }
  if (tabInfo.type === ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE) {
    return (
      <div className="flex flex-col gap-2 px-2">
        <Alert className="max-w-md">
          <InfoIcon />
          <AlertDescription>
            Navigue vers une publication youtube ou instagram pour lancer une
            analyse.
          </AlertDescription>
        </Alert>
        <ViewPreviousAnalysesButton />
      </div>
    );
  }

  if (
    tabInfo.type === ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED
  ) {
    return (
      <div className="flex flex-col gap-2 px-2">
        <StartScrapingButton tabId={tabInfo.tabId} />
        <ViewPreviousAnalysesButton />
      </div>
    );
  }
  // Scraping has already been started, completed... use SidePanel to display it
  return (
    <Button
      data-testid="start-scraping-button"
      className="w-full"
      onClick={() => {
        void openSidePanel(tabInfo.tabId).then(() => {
          window.close();
        });
      }}
    >
      Ouvrir le side panel
    </Button>
  );
}

function StartScrapingButton({ tabId }: { tabId: number }) {
  return (
    <Button
      data-testid="start-scraping-button"
      className="w-full"
      onClick={() => handleStartScrapingClick(tabId)}
    >
      Analyser cette publication
    </Button>
  );
}

async function queryTabWithUrl(tabUrl: string) {
  console.log("Querying to tab with url " + tabUrl);
  const queryOptions = { url: tabUrl };
  const tabs = await browser.tabs.query(queryOptions);
  if (tabs.length === 0) {
    throw new Error("Couldn't find a tab with url: " + tabUrl);
  }
  return tabs[0];
}

async function queryActiveTab(): Promise<Browser.tabs.Tab | undefined> {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await browser.tabs.query(queryOptions);
  return tab;
}

async function handleStartScrapingClick(tabId: number) {
  startScraping(tabId);
  await openSidePanel(tabId);
  window.close();
}
