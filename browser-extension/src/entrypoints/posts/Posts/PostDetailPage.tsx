import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SocialNetwork,
  SocialNetworkName,
} from "@/shared/model/SocialNetworkName";
import { getPostByPostId } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { MoveLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import PostSummary from "../Shared/PostSummary";
import KpiCard from "../Shared/KpiCard";
import { isCommentHateful } from "@/shared/utils/post-util";
import { getPercentage } from "@/shared/utils/maths";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import CommentsTable from "./CommentsTable";

function PostDetailPage() {
  const params = useParams();
  const postId = params.postId || "";
  const socialNetworkName = params.socialNetworkName as SocialNetworkName;

  const queryKey = ["posts", postId];
  const { data: post, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getPostByPostId(socialNetworkName, postId),
  });

  let percentageOfHatefulComments = 0;
  let numberOfHatefulComments = 0;
  let numberOfHatefulAuthors = 0;

  const allComments = post?.comments || [];
  const hatefulComments = allComments.filter((c) => isCommentHateful(c));
  if (allComments.length !== 0) {
    numberOfHatefulComments = hatefulComments.length;
    percentageOfHatefulComments = getPercentage(
      numberOfHatefulComments,
      allComments.length,
    );
    numberOfHatefulAuthors = new Set(hatefulComments.map((c) => c.author.name))
      .size;
  }

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
              <CardContent className="flex gap-3">
                <PostSummary post={post} />
                <span className="">
                  {getSocialNetworkName(post.socialNetwork)}
                </span>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3">
              <div className="flex">
                <div className="flex gap-4 justify-between">
                  <KpiCard
                    title="Nombre de commentaires haineux"
                    value={`${numberOfHatefulComments.toString()}/${allComments.length.toString()}`}
                    isWorkInProgress={false}
                    isLoading={isLoading}
                  ></KpiCard>
                  <KpiCard
                    title="Part des commentaires haineux"
                    value={percentageOfHatefulComments.toFixed(2) + "%"}
                    isWorkInProgress={false}
                    isLoading={isLoading}
                  ></KpiCard>
                  <KpiCard
                    title="Nombre d'auteurs des commentaires haineux"
                    value={numberOfHatefulAuthors.toString()}
                    isWorkInProgress={false}
                    isLoading={isLoading}
                  ></KpiCard>
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
                selectedCommentList={() => console.log("submitted")}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PostDetailPage;

function formatAnalysisDate(isoDateTime: string): string {
  const date: string = new Date(isoDateTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time: string = new Date(isoDateTime).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} à ${time}`;
}

function getSocialNetworkName(socialNetwork: SocialNetworkName): string {
  switch (socialNetwork) {
    case SocialNetwork.YouTube:
      return "YouTube";
    case SocialNetwork.Instagram:
      return "Instagram";
    default:
      return "";
  }
}
