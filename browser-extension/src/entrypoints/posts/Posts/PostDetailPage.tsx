import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { getPostByPostId } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { MoveLeft, RotateCwIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import PostSummary from "../Shared/PostSummary";
import KpiCard from "../Shared/KpiCards/KpiCard";
import {
  formatAnalysisDate,
  getPublicationTypeLabel,
  getSocialNetworkName,
  isCommentHateful,
} from "@/shared/utils/post-util";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import CommentsTable, { PostCommentWithId } from "./CommentsTable";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import { openPostAndStartScraping } from "@/entrypoints/actions/openPostAndStartScraping";

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
  const hatefulComments = allComments
    .filter((c) => isCommentHateful(c))
    .map((comment, i) => {
      return {
        ...comment,
        id: i.toString(),
        postKey: `${post?.postId}-${post?.socialNetwork}`,
      } as PostCommentWithId;
    });

  const numberOfHatefulComments = hatefulComments.length;

  return (
    <div className="p-4 flex flex-col gap-6 w-5/6">
      {isLoading && <div>Chargement...</div>}
      {post && (
        <>
          {/* Header */}
          <div className="flex justify-between">
            <Button
              variant="link"
              render={
                <Link to="/posts">
                  <MoveLeft /> Publications analysées
                </Link>
              }
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void openPostAndStartScraping(post.url);
                }}
              >
                <RotateCwIcon /> Relancer l&apos;analyse
              </Button>
              <Button variant="outline" disabled>
                Exporter en CSV
              </Button>
              <Button variant="outline" disabled>
                Exporter en PDF
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="mt-2 mb-1 ">
                Analyse des commentaires malveillants
              </h1>
              <span className="text-lg mt-0">
                Données collectées le{" "}
                {formatAnalysisDate(post.lastAnalysisDate)}
              </span>
            </div>
            <h2 className="text-left">Publication analysée</h2>
            <Card>
              <CardContent className="flex gap-3 justify-between">
                <PostSummary post={post} />
                <div className="text-right text-muted-foreground whitespace-nowrap">
                  <div>{getSocialNetworkName(post.socialNetwork)}</div>
                  <div>
                    Type:{" "}
                    {getPublicationTypeLabel(post.url, post.socialNetwork)}
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3">
              <div className="flex">
                <div className="flex gap-4 justify-between">
                  <NumberHatefulCommentsKpiCard
                    numberOfHatefulComments={numberOfHatefulComments}
                    numberOfComments={allComments.length}
                    isLoading={isLoading}
                  />
                  <PercentageHatefulCommentsKpiCard
                    numberOfHatefulComments={numberOfHatefulComments}
                    numberOfComments={allComments.length}
                    isLoading={isLoading}
                  />
                  <NumberHatefulAuhorsKpiCard
                    hatefulCommentList={hatefulComments}
                    isLoading={isLoading}
                  />
                  <KpiCard
                    title="Gravité"
                    value="Modérée"
                    isWorkInProgress={true}
                    isLoading={isLoading}
                  ></KpiCard>
                </div>
              </div>
              <div className="flex gap-4">
                <ActiveAuthors
                  postComments={post.comments}
                  isLoading={isLoading}
                />
                <CategoryDistribution />
              </div>
            </div>
            <div className="text-left">
              <h2>Commentaires malveillants</h2>
              <span className="text-gray-500">
                Sélectionner les commentaires pour créer un rapport
              </span>
              <CommentsTable
                commentList={hatefulComments}
                defaultSelectedCommentIdList={[]}
                formId=""
                onSubmit={() => console.log("submitted")}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PostDetailPage;
