import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { getPostByPostId } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { MoveLeft, RotateCwIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import PostSummary from "../Shared/PostSummary";
import {
  formatAnalysisDate,
  isCommentHateful,
  buildPostKey,
} from "@/shared/utils/post-util";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import CommentsTable, { PostCommentWithId } from "./CommentsTable";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import { openPostAndStartScraping } from "@/entrypoints/actions/openPostAndStartScraping";
import SecurityAlert from "../Shared/KpiCards/SecurityAlert";

function PostDetailPage() {
  const params = useParams();
  const postId = params.postId || "";
  const socialNetworkName = params.socialNetworkName as SocialNetworkName;

  const queryKey = ["posts", postId];
  const { data: post, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getPostByPostId(socialNetworkName, postId),
  });

  const allComments = post?.comments || [];
  const hatefulComments = post
    ? allComments
        .filter((c) => isCommentHateful(c))
        .map((comment, i) => {
          return {
            ...comment,
            id: i.toString(),
            postKey: buildPostKey(post.postId, post.socialNetwork),
            socialNetwork: post.socialNetwork,
          } as PostCommentWithId;
        })
    : [];

  const numberOfHatefulComments = hatefulComments.length;

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
              <Button roundness="round" variant="default" disabled>
                Exporter les données en CSV
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4">
            <div className="mb-8">
              <h1 className="mt-2 mb-1 ">
                Analyse des commentaires malveillants
              </h1>
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
                <PostSummary post={post} />
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3">
              <div className="flex gap-4 justify-between w-full">
                <PercentageHatefulCommentsKpiCard
                  numberOfHatefulComments={numberOfHatefulComments}
                  numberOfComments={allComments.length}
                  isLoading={isLoading}
                />
                <NumberHatefulCommentsKpiCard
                  numberOfHatefulComments={numberOfHatefulComments}
                  numberOfComments={allComments.length}
                  isLoading={isLoading}
                />
                <SecurityAlert isLoading={isLoading}></SecurityAlert>
                <NumberHatefulAuhorsKpiCard
                  hatefulCommentList={hatefulComments}
                  isLoading={isLoading}
                />
              </div>
              <div className="flex gap-4 w-full">
                <ActiveAuthors
                  postComments={post.comments}
                  isLoading={isLoading}
                />
                <CategoryDistribution
                  postComments={post.comments}
                  isLoading={isLoading}
                />
              </div>
            </div>
            <div className="text-left">
              <h3>Commentaires malveillants</h3>
              <span className="text-muted-foreground text-sm italic">
                Pour créer un rapport de preuves : sélectionner un ou plusieurs
                commentaires (ou “Tout sélectionner”), puis cliquer sur “Créer
                un rapport”.
              </span>
              <CommentsTable
                commentList={hatefulComments}
                defaultSelectedCommentIdList={[]}
                formId=""
                onSubmit={() => console.log("submitted")}
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
