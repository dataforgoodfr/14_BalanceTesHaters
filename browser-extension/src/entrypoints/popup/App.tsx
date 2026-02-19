import { useState } from "react";
import "./App.css";
import { getCurrentTab } from "@/shared/utils/getCurrentTab";
import { parseSocialNetworkUrl } from "@/shared/social-network-url";
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

const sendScrapMessage = (tabId: number) => {
  console.log("Popup - Sending ScrapTabMessage");
  const message: ScrapTabMessage = {
    msgType: "scrap-tab",
    tabId: tabId,
  };
  browser.runtime.sendMessage(message);
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
  const [linkedTab, setLinkedTab] = useState<Browser.tabs.Tab | undefined>(
    undefined,
  );
  useEffect(() => {
    queryLinkedTab(document.URL).then((tab) => {
      setLinkedTab(tab);
    });
  }, []);

  const parsedUrl = useMemo(() => {
    return linkedTab?.url !== undefined && parseSocialNetworkUrl(linkedTab.url);
  }, [linkedTab]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Balance Tes Haters</CardTitle>
          {!parsedUrl && (
            <CardDescription>
              Pour capturer des commentaires et les analyser naviguez vers une
              publication d&apos;un réseau social supporté (youtube,
              instagram...) puis ouvrez l&apos;extension à nouveau.
            </CardDescription>
          )}
          {parsedUrl && (
            <CardDescription>
              Vous êtes sur un {parsedUrl.type} {parsedUrl.socialNetwork}.
            </CardDescription>
          )}
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          {parsedUrl && (
            <Button
              data-testid="start-scraping-button"
              className="w-full"
              disabled={!linkedTab?.id}
              onClick={() => sendScrapMessage(linkedTab?.id || NaN)}
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
