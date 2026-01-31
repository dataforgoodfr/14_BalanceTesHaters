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

const sendScrapMessage = () => {
  browser.runtime.sendMessage({ msgType: "scrap-active-tab" });
};

const reportPageUrl = browser.runtime.getURL("/posts.html");

export default function App() {
  useInitializeTheme();
  const [currentTab, setCurrentTab] = useState<Browser.tabs.Tab | undefined>(
    undefined,
  );
  useEffect(() => {
    getCurrentTab().then((tab) => {
      setCurrentTab(tab);
    });
  }, []);

  const parsedUrl = useMemo(() => {
    return (
      currentTab?.url !== undefined && parseSocialNetworkUrl(currentTab.url)
    );
  }, [currentTab]);

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
            <Button className="w-full" onClick={() => sendScrapMessage()}>
              Analyser ce post
            </Button>
          )}
          <Button
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
