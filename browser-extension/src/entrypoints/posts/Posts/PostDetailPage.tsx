import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { getPostByPostId } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { MoveLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import PostSummary from "../Shared/PostSummary";

function PostDetailPage() {
  const params = useParams();
  const postId = params.postId || "";
  const socialNetworkName = params.socialNetworkName as SocialNetworkName;

  const queryKey = ["posts", postId];
  const { data: post, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getPostByPostId(socialNetworkName, postId),
  });

  return (
    <div className="p-4 flex flex-col gap-6 w-3/4">
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
              <h1 className="mt-2 mb-1 ">Analyse des commentaires malveillants</h1>
              <span className="text-lg mt-0">
                Données collectées le{" "}
                {formatAnalysisDate(post.lastAnalysisDate)}
              </span>
            </div>
            <h2 className="text-left">Publication analysée</h2>
            <Card>
              <CardContent className="flex gap-3">
                  <PostSummary post={post} />
                  <span className="">{getSocialNetworkName(post.socialNetwork)}</span>
              </CardContent>
            </Card>
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
    case "YOUTUBE":
      return "YouTube";
    case "INSTAGRAM":
      return "Instagram";
    default:
      return "";
  } 
}