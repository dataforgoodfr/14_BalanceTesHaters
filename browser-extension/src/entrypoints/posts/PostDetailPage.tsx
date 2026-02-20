import { getPostByIdAndScrapedAt } from "@/shared/storage/posts-storage";
import { isRunningClassificationStatus } from "@/shared/model/post";
import { Link, useParams } from "react-router";
import { CommentTreeTable } from "./CommentTreeTable";
import { Binary, Check, MoveLeft, RefreshCcwIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DisplayPublicationDate from "./DisplayPublicationDate";
import { SubmitClassificationRequestMessage } from "../background/classification/submitClassificationForPostMessage";
import { updatePostWithClassificationResultMessage } from "../background/classification/updatePostWithClassificationResultMessage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

function PostDetailPage() {
  const { postId, scrapedAt } = useParams();

  const queryClient = useQueryClient();

  const queryKey = ["posts", postId, scrapedAt];
  const { data: post, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getPostByIdAndScrapedAt(postId!, scrapedAt!),
  });

  const startOrRefreshStatusMutation = useMutation({
    mutationFn: async () => {
      if (!post) {
        return;
      }

      if (!post.classificationStatus) {
        const message: SubmitClassificationRequestMessage = {
          msgType: "submit-classification-request",
          postId: post.postId,
          scrapedAt: post.scrapedAt,
        };
        await browser.runtime.sendMessage(message);
      } else if (isRunningClassificationStatus(post.classificationStatus)) {
        const message: updatePostWithClassificationResultMessage = {
          msgType: "update-post-classification",
          postId: post.postId,
          scrapedAt: post.scrapedAt,
        };
        await browser.runtime.sendMessage(message);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      return queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <div className="p-4">
      {isLoading && <div>Loading...</div>}
      {post && (
        <>
          <h1 className="text-left pt-2 mb-4">
            Publication {post.socialNetwork} - {post.postId} de{" "}
            <a
              href={post.author.accountHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.author.name}
            </a>
          </h1>
          <div className="text-left">
            <Button
              variant="link"
              render={
                <Link to="/posts">
                  <MoveLeft /> Retour à la liste des publications
                </Link>
              }
            />
          </div>

          <h2 className="text-left pt-2 mb-4">Details</h2>
          <div className="rounded-md border text-left p-4 grid grid-cols-2">
            <div>
              <div className="text-lg">
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  {" "}
                  {post.title}
                </a>
              </div>
              Publiée le: <DisplayPublicationDate date={post.publishedAt} />
              <div>
                Capturée le: {new Date(post.scrapedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="italic">
              <p className="whitespace-pre-wrap">{post.textContent}</p>
            </div>
          </div>

          <h2 className="text-left pt-2 mb-4">État classification</h2>
          <div className="text-left flex flex-row items-center gap-2  ">
            {post.classificationStatus === "COMPLETED" && (
              <Check className="text-green-500" />
            )}
            {post.classificationStatus &&
              isRunningClassificationStatus(post.classificationStatus) && (
                <Binary className="text-orange-500" />
              )}
            {!post.classificationStatus ||
              (post.classificationStatus === "FAILED" && (
                <X className="text-red-500" />
              ))}
            <span className="font-medium">
              {post.classificationStatus && post.classificationStatus}
              {!post.classificationStatus && "Non démarrée"}
            </span>
            {(!post.classificationStatus ||
              isRunningClassificationStatus(post.classificationStatus)) && (
              <Button
                size="sm"
                className="ml-3"
                disabled={startOrRefreshStatusMutation.isPending}
                onClick={() => startOrRefreshStatusMutation.mutate()}
              >
                {startOrRefreshStatusMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCcwIcon data-icon="inline-start" />
                )}
                Mettre à jour
              </Button>
            )}
          </div>

          <h2 className="text-left pt-2 my-4">Commentaires</h2>

          <CommentTreeTable comments={post.comments} />
        </>
      )}
    </div>
  );
}

export default PostDetailPage;
