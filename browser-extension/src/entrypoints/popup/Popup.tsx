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
import { useScrapingAndClassificationTabInfo } from "./useScrapingAndClassificationTabInfo";
import { sendScrapMessage } from "./sendScrapMessage";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";

async function openSidePanel(tabId: number): Promise<void> {
  await browser.sidePanel.setOptions({
    tabId: tabId,
    path: "scraping-sidepanel.html",
    enabled: true,
  });
  await browser.sidePanel.open({
    tabId: tabId,
  });
}

async function handleStartScrapingClick(tabId: number) {
  sendScrapMessage(tabId);
  await openSidePanel(tabId);
  window.close();
}

const title = "Balance Tes Haters";
export function Popup() {
  const {
    isPending,
    error: queryError,
    data: tabInfo,
  } = useScrapingAndClassificationTabInfo();

  if (queryError) {
    return (
      <span>
        Oops! Impossible de récupéréer les infos du tab courant!!
        <pre>{queryError.message}</pre>
      </span>
    );
  }

  if (isPending || tabInfo.type === "no-tab") {
    return <Spinner className="size-16 m-auto" />;
  }
  if (tabInfo.type === "not-scrapable") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Pour capturer des commentaires et les analyser naviguez vers une
            publication d&apos;un réseau social supporté (youtube, instagram...)
            puis ouvrez l&apos;extension à nouveau.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">
          <ViewPreviousAnalysesButton />
        </CardFooter>
      </Card>
    );
  }

  if (tabInfo.type === "scraping-not-started") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Vous êtes sur une publication {tabInfo.pageInfo.socialNetwork}{" "}
            analyzable.
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
