import { Button } from "@/components/ui/button";
import { TabInfoClassificationSucceeded } from "../useScrapingAndClassificationTabInfo";
import { startScraping } from "../startScraping";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";
import { Progress } from "@/components/ui/progress";
import { CircleCheckBigIcon, HandHeartIcon } from "lucide-react";
import { hateStats as computeHateStats } from "./hateStats";
import { ClassificationSummary } from "./ClassificationSummary";
import { getPostDetailsUrl } from "@/shared/extension-urls";

export function DisplayClassificationSucceeded({
  tabInfo,
}: {
  tabInfo: TabInfoClassificationSucceeded;
}) {
  const hateStats = computeHateStats(tabInfo.post);
  const hasHatefullComments = hateStats.hatefulCommentsCount > 0;
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <CircleCheckBigIcon />
          Analyse terminée
        </SidePanelTitle>
        <Progress title="Progrès de l'Analyse" value={100} />
      </SidePanelHeader>
      <ClassificationSummary hateStats={hateStats} />
      <SidePanelActions>
        {hasHatefullComments && (
          <Button
            size="lg"
            data-testid="view-analysis-button"
            className="w-full"
            variant="default"
            render={
              <a
                href={getPostDetailsUrl(
                  tabInfo.pageInfo.socialNetwork,
                  tabInfo.pageInfo.postId,
                )}
                target="bth-posts"
              >
                Voir l&apos;analyse de cette publications
              </a>
            }
          />
        )}

        <Button
          size="lg"
          data-testid="start-scraping-button"
          className="w-full"
          variant={hasHatefullComments ? "outline" : "default"}
          onClick={() => startScraping(tabInfo.tabId)}
        >
          Lancer une nouvelle analyse
        </Button>

        <ViewPreviousAnalysesButton />
      </SidePanelActions>
      {hasHatefullComments && (
        <div className="flex flex-row gap-2 font-[Red Hat Text Variable] font-normal italic text-sm text-left">
          <HandHeartIcon className="size-6 flex-none text-muted-foreground" />
          <div>
            Rappel : rien ne justifie ces violences qui sont réprimées par la
            loi, tu n’es en aucun cas responsable de ces messages. On est là
            pour t’aider à agir.
          </div>
        </div>
      )}
    </SidePanelLayout>
  );
}
