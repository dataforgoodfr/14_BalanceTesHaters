import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  ScrapingAndClassificationTabInfoType,
  useScrapingAndClassificationTabInfo,
} from "../scraping-sidepanel/useScrapingAndClassificationTabInfo";
import { startScraping } from "../scraping-sidepanel/startScraping";
import { ViewPreviousAnalysesButton } from "../scraping-sidepanel/ViewPreviousAnalysesButton";
import { openSidePanel } from "./openSidePanel";

const title = "Balance Tes Haters";
export function Popup() {
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
      <span>
        Oops! Impossible de récupéréer les infos du tab courant!!
        <pre>{queryError.message}</pre>
      </span>
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
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Navigue vers une publication d&apos;un réseau social supporté
            (youtube, instagram...) pour pouvoir lancer l&apos;analyse.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <ViewPreviousAnalysesButton />
        </CardFooter>
      </Card>
    );
  }

  if (
    tabInfo.type === ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Vous êtes sur une publication {tabInfo.pageInfo.socialNetwork}{" "}
            analysable.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <StartScrapingButton tabId={tabInfo.tabId} />
          <ViewPreviousAnalysesButton />
        </CardFooter>
      </Card>
    );
  }
  // Scraping has already been started, completed... use SidePanel to display it
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Analyse démarrée.</p>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          data-testid="start-scraping-button"
          className="w-full"
          onClick={() => {
            openSidePanel(tabInfo.tabId);
            window.close();
          }}
        >
          Ouvrir le side panel
        </Button>
        <ViewPreviousAnalysesButton />
      </CardFooter>
    </Card>
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
