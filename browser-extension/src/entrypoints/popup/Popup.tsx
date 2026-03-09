import "./App.css";
import { getCurrentTab } from "@/shared/utils/getCurrentTab";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrapTabMessage } from "../background/scraping/scrap-tab-message";
import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { ScrapingStatus } from "@/shared/scraping-content-script/ScrapingStatus";

const sendScrapMessage = (tabId: number) => {
  console.log("Popup - Sending ScrapTabMessage");
  const message: ScrapTabMessage = {
    msgType: "scrap-tab",
    tabId: tabId,
  };
  browser.runtime.sendMessage(message);
  window.close();
};

const reportPageUrl = browser.runtime.getURL("/posts.html");

async function queryLinkedTab(url: string): Promise<Browser.tabs.Tab> {
  const parsedUrl = URL.parse(url);
  const tabUrl = parsedUrl?.hash?.substring(1);
  if (tabUrl) {
    console.log("Querying to tab with url " + tabUrl);
    const queryOptions = { url: tabUrl };
    const tabs = await browser.tabs.query(queryOptions);
    if (tabs.length === 0) {
      throw new Error("Couldn't find a tab with url: " + tabUrl);
    }
    return tabs[0];
  } else {
    return (await getCurrentTab())!;
  }
}

type LinkedTabInfo = {
  tabId: number;
  pageInfo: SocialNetworkPageInfo;
  scrapingStatus?: ScrapingStatus;
};

async function queryLinkedTabInfo(): Promise<LinkedTabInfo> {
  const tab = await queryLinkedTab(document.URL);
  if (tab.id === undefined) {
    throw new Error("tab.id undefined on tab: " + JSON.stringify(tab));
  }
  const client = new ScrapingContentScriptClient(tab.id);
  const pageInfo = await client.getTabSocialNetworkPageInfo();

  const scrapingStatus = pageInfo.isScrapablePost
    ? await client.getScrapingStatus()
    : undefined;

  return {
    tabId: tab.id,
    pageInfo,
    scrapingStatus,
  };
}
export function Popup() {
  const {
    isPending,
    error: queryError,
    data: tabInfo,
  } = useQuery({
    queryKey: ["linkedTabInfo"],
    queryFn: queryLinkedTabInfo,
    refetchInterval: 2000,
  });

  if (isPending) {
    return <Spinner />;
  }
  if (queryError) {
    return (
      <span>
        Oops! Impossible de récupéréer les infos du tab courant!!
        <pre>{queryError.message}</pre>
      </span>
    );
  }

  const isScrapablePost = tabInfo.pageInfo.isScrapablePost;
  const isScrapingRunning =
    tabInfo.scrapingStatus && tabInfo.scrapingStatus.type === "running";
  const isScrapingNotStarted =
    tabInfo.scrapingStatus && tabInfo.scrapingStatus.type === "not-started";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Tes Haters</CardTitle>
        {isScrapablePost ? (
          <CardDescription>
            {tabInfo.scrapingStatus &&
              tabInfo.scrapingStatus.type === "failed" && (
                <p>
                  La capture à échouer:
                  <pre>{tabInfo.scrapingStatus.errorMessage}</pre>
                </p>
              )}
            {isScrapingRunning && (
              <p>
                <Spinner className="inline mx-1" /> Capture en cours.
                <br />
                Merci de patienter.
              </p>
            )}
            {isScrapingNotStarted && (
              <p>
                Vous êtes sur une publication {tabInfo.pageInfo.socialNetwork}{" "}
                analyzable.
              </p>
            )}
          </CardDescription>
        ) : (
          <CardDescription>
            Pour capturer des commentaires et les analyser naviguez vers une
            publication d&apos;un réseau social supporté (youtube, instagram...)
            puis ouvrez l&apos;extension à nouveau.
          </CardDescription>
        )}
      </CardHeader>
      <CardFooter className="flex-col gap-2">
        {isScrapablePost && (
          <Button
            data-testid="start-scraping-button"
            className="w-full"
            disabled={isScrapingRunning}
            onClick={() => sendScrapMessage(tabInfo.tabId)}
          >
            {isScrapingRunning && <Spinner data-icon="inline-start" />}
            Analyser ce post
          </Button>
        )}

        <Button
          data-testid="view-analysis-button"
          className="w-full"
          variant="outline"
          render={
            <a href={reportPageUrl} target="bth-posts">
              Voir les analyses précedentes
            </a>
          }
        ></Button>
      </CardFooter>
    </Card>
  );
}
