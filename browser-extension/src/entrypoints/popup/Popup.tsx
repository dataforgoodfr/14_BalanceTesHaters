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
    console.log("trying to link to tab with url " + tabUrl);
    const queryOptions = { url: tabUrl };
    const [tab] = await browser.tabs.query(queryOptions);
    return tab;
  } else {
    return (await getCurrentTab())!;
  }
}

type LinkedTabInfo = {
  tabId: number;
  pageInfo: SocialNetworkPageInfo;
};

async function queryLinkedTabInfo(): Promise<LinkedTabInfo> {
  const tab = await queryLinkedTab(document.URL);
  if (tab.id === undefined) {
    throw new Error("tab.id undefined on tab: " + JSON.stringify(tab));
  }
  const client = new ScrapingContentScriptClient(tab.id);
  const pageInfo = await client.getTabSocialNetworkPageInfo();

  return {
    tabId: tab.id,
    pageInfo,
  };
}
export function Popup() {
  const {
    isPending,
    error,
    data: tabInfo,
  } = useQuery({
    queryKey: ["linkedTabInfo"],
    queryFn: queryLinkedTabInfo,
  });

  if (isPending) {
    return <Spinner />;
  }
  if (error) {
    return <span>Oops! Impossible de récupéré les infos du tab courant!!</span>;
  }

  const isScrapablePost = tabInfo.pageInfo.isScrapablePost;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Tes Haters</CardTitle>

        {isScrapablePost ? (
          <CardDescription>
            Vous êtes sur une publication {tabInfo.pageInfo.socialNetwork}{" "}
            analyzable.
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
            onClick={() => sendScrapMessage(tabInfo.tabId)}
          >
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
