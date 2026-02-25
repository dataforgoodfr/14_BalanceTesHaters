import { useState } from "react";
import "./App.css";
import { getCurrentTab } from "@/shared/utils/getCurrentTab";
import { useInitializeTheme } from "@/styles/useInitializeTheme";
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

export default function App() {
  useInitializeTheme();

  const [linkedTabId, setLinkedTabId] = useState<number | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState<SocialNetworkPageInfo | undefined>(
    undefined,
  );
  useEffect(() => {
    queryLinkedTab(document.URL)
      .then((tab) => {
        if (tab.id === undefined) {
          console.error("tab.id undefined on tab", tab);
          return;
        }
        setLinkedTabId(tab.id);
        return new ScrapingContentScriptClient(
          tab.id,
        ).getTabSocialNetworkPageInfo();
      })
      .then((linkedPageInfo) => setPageInfo(linkedPageInfo));
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Balance Tes Haters</CardTitle>
          {!pageInfo?.isScrapablePost && (
            <CardDescription>
              Pour capturer des commentaires et les analyser naviguez vers une
              publication d&apos;un réseau social supporté (youtube,
              instagram...) puis ouvrez l&apos;extension à nouveau.
            </CardDescription>
          )}
          {pageInfo && pageInfo.isScrapablePost && (
            <CardDescription>
              Vous êtes sur une publication {pageInfo.socialNetwork} analyzable.
            </CardDescription>
          )}
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          {linkedTabId && pageInfo?.isScrapablePost && (
            <Button
              data-testid="start-scraping-button"
              className="w-full"
              onClick={() => sendScrapMessage(linkedTabId)}
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
    </>
  );
}
