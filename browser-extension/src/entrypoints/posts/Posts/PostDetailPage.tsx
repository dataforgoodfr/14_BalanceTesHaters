import { Tabs } from "@base-ui/react/tabs";
import { AI_SCORE_HATE_THRESHOLD } from "@/shared/constants/ai-score-hate-threshold";
import { COMMENT_STATISTICS_TABS } from "../Shared/commentStatistics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { getPostByPostId } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { HandHeart, MoveLeft, RotateCwIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import PostSummary from "../Shared/PostSummary";
import {
  formatAnalysisDate,
  CommentSortingCategory,
} from "@/shared/utils/post-util";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CommentsTable from "./CommentsTable";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import { openPostAndStartScraping } from "@/entrypoints/actions/openPostAndStartScraping";
import { useFilteredCommentList } from "../Shared/useFilteredCommentList";
import React from "react";
import ClosableAlert from "../Shared/ClosableAlert";
import { main } from "../Menu";
import { buildPostDetailCsv } from "./postDetailCsv";
import { createLogger } from "@/shared/utils/createLogger";

// Set to false to show the KPI cards in a row above the author statistics.
const ENABLE_TWO_COLUMN_STATS_LAYOUT = true;

const logger = createLogger("post-detail");

function PostDetailPage() {
  const params = useParams();
  const postId = params.postId || "";
  const socialNetworkName = params.socialNetworkName as SocialNetworkName;

  const queryKey = ["post", socialNetworkName, postId];
  const { data: post, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getPostByPostId(socialNetworkName, postId),
  });

  const [commentSortingCategory, setCommentSortingCategory] =
    React.useState<CommentSortingCategory>(
      CommentSortingCategory.HATE_SCORE_DESC,
    );

  const {
    commentFilters,
    setCommentFilters,
    allComments,
    filteredCommentList,
    authorList,
  } = useFilteredCommentList(
    postId === undefined ? [] : [postId],
    commentSortingCategory,
  );

  const nbComments = allComments.length;
  const statisticsTabs = COMMENT_STATISTICS_TABS.map((tab) => ({
    ...tab,
    comments: allComments.filter(tab.isHateful),
  }));

  const postExportCsv = () => {
    if (!post) {
      return;
    }
    const csvContent = buildPostDetailCsv(post, filteredCommentList);
    const generatedAt = new Date().toISOString().replace(/[:.]/g, "-");

    void browser.downloads.download({
      url:
        "data:text/csv;charset=utf-8," +
        encodeURIComponent("\uFEFF" + csvContent),
      filename: `publication-bth-${post.postId}-${generatedAt}.csv`,
      saveAs: true,
    });
  };

  return (
    <main className="flex flex-col gap-6">
      {isLoading && <div>Chargement...</div>}
      {post && (
        <>
          {/* Header */}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              render={
                <Link to="/posts">
                  <MoveLeft /> Publications analysées
                </Link>
              }
            />
            <div className="flex gap-2">
              <Button
                roundness="round"
                variant="secondary"
                onClick={() => {
                  void openPostAndStartScraping(post.url);
                }}
              >
                <RotateCwIcon /> Relancer l&apos;analyse
              </Button>
              <Button
                roundness="round"
                variant="default"
                onClick={postExportCsv}
              >
                Exporter les données en CSV
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4">
            <div className="mb-8">
              <h1 className="mt-2 mb-1 ">Analyse des commentaires</h1>
              <div className="text-base mt-0">
                Données collectées le{" "}
                {formatAnalysisDate(post.firstAnalysisDate)}
              </div>
              {post.analysisCount > 1 && (
                <div className="text-base mt-0 italic">
                  Mise à jour le {formatAnalysisDate(post.latestAnalysisDate)}
                </div>
              )}
            </div>
            <h3 className="text-left">Publication analysée</h3>
            <Card>
              <CardContent className="flex gap-3 justify-between">
                <PostSummary post={{ ...post, comments: allComments }} />
              </CardContent>
            </Card>
            <Tabs.Root defaultValue="ai" className="flex flex-col gap-4">
              <Tabs.List
                aria-label="Source des statistiques"
                className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
              >
                {statisticsTabs.map((tab) => (
                  <Tabs.Tab
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground outline-none data-active:bg-background data-active:text-foreground data-active:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {tab.comments.length} {tab.label}
                    {tab.value === "ai" &&
                      ` (score > ${AI_SCORE_HATE_THRESHOLD * 100}%)`}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              {statisticsTabs.map((tab) => {
                const hatefulComments = tab.comments;
                const nbHatefulComments = hatefulComments.length;
                return (
                  <Tabs.Panel
                    key={tab.value}
                    value={tab.value}
                    className="outline-none"
                  >
                    <div
                      className={
                        ENABLE_TWO_COLUMN_STATS_LAYOUT
                          ? "grid grid-cols-1 gap-4 lg:grid-cols-3"
                          : "flex flex-col gap-3"
                      }
                    >
                      <div
                        className={
                          ENABLE_TWO_COLUMN_STATS_LAYOUT
                            ? "grid gap-4"
                            : "grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
                        }
                      >
                        <PercentageHatefulCommentsKpiCard
                          commentLabel={tab.label}
                          numberOfHatefulComments={nbHatefulComments}
                          numberOfComments={nbComments}
                          isLoading={isLoading}
                        />
                        <NumberHatefulCommentsKpiCard
                          commentLabel={tab.label}
                          numberOfHatefulComments={nbHatefulComments}
                          numberOfComments={nbComments}
                          isLoading={isLoading}
                        />
                        <NumberHatefulAuhorsKpiCard
                          commentLabel={tab.label}
                          hatefulCommentList={hatefulComments}
                          isLoading={isLoading}
                        />
                      </div>
                      <div
                        className={
                          ENABLE_TWO_COLUMN_STATS_LAYOUT
                            ? "grid min-w-0 lg:col-span-2"
                            : "grid grid-cols-1 gap-4 w-full"
                        }
                      >
                        <ActiveAuthors
                          commentLabel={tab.label}
                          postComments={allComments}
                          isHateful={tab.isHateful}
                          isLoading={isLoading}
                        />
                      </div>
                    </div>
                  </Tabs.Panel>
                );
              })}
            </Tabs.Root>
            <div className="text-left">
              <h3>Commentaires</h3>
              <span className="text-muted-foreground text-sm italic">
                Pour créer un rapport de preuves : déclarer un ou plusieurs
                commentaires malveillants, puis cliquer sur “Créer un rapport”.
              </span>

              <ClosableAlert
                title="Rappel"
                icon={<HandHeart />}
                className="my-3"
                variant="support"
              >
                Le contenu des commentaires peut être sensible. Ces commentaires
                sont inacceptables, et des actions sont possibles (voir “
                <Link to={main.menuEntries.Help.to}>
                  {main.menuEntries.Help.label}
                </Link>
                ”)
              </ClosableAlert>

              <CommentsTable
                commentList={filteredCommentList}
                commentFilters={commentFilters}
                setCommentFilters={setCommentFilters}
                commentSortingCategory={commentSortingCategory}
                setCommentSortingCategory={setCommentSortingCategory}
                defaultSelectedCommentIdList={[]}
                formId=""
                // Keep all authors available regardless of the active comment filters.
                authorList={authorList}
                onSubmit={() => logger.debug("Comments submitted")}
                showCreateReportButton={true}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default PostDetailPage;
