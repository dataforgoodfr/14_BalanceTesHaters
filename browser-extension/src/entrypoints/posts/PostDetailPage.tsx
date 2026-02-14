import { useEffect, useState } from "react";
import { getPostByIdAndScrapedAt } from "@/shared/storage/posts-storage";
import { isRunningClassificationStatus, Post } from "@/shared/model/post";
import { Link, useParams } from "react-router";
import { CommentTreeTable } from "./CommentTreeTable";
import { Binary, Check, MoveLeft, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitClassificationRequestMessage } from "../background/classification/submitClassificationForPostMessage";
import { updatePostWithClassificationResultMessage } from "../background/classification/updatePostWithClassificationResultMessage";

function PostDetailPage() {
  const { postId, scrapedAt } = useParams();
  const [post, setPost] = useState<Post | undefined>(undefined);
  useEffect(() => {
    if (postId && scrapedAt) {
      getPostByIdAndScrapedAt(postId, scrapedAt).then((post) => {
        setPost(post);
      });
    }
  }, [postId, scrapedAt]);

  const handleStartOrRefreshStatus = async () => {
    if (post) {
      if (!post.classificationStatus) {
        const message: SubmitClassificationRequestMessage = {
          msgType: "submit-classification-request",
          postId: post.postId,
          scrapedAt: post.scrapedAt,
        };
        await browser.runtime.sendMessage(message);
        // TODO properly reload data
        globalThis.location.reload();
      } else if (isRunningClassificationStatus(post.classificationStatus)) {
        const message: updatePostWithClassificationResultMessage = {
          msgType: "update-post-classification",
          postId: post.postId,
          scrapedAt: post.scrapedAt,
        };
        await browser.runtime.sendMessage(message);
        // TODO properly reload data
        globalThis.location.reload();
      }
    }
  };

  return (
    <>
      {!post && <div>Loading...</div>}
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
                <Link to="/">
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
              <div>Publication: {post.publishedAt}</div>
              <div>
                Capture: {new Date(post.scrapedAt).toLocaleDateString()}
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
                onClick={handleStartOrRefreshStatus}
              >
                <RefreshCcw className="mr-2" />
                Mettre à jour
              </Button>
            )}
          </div>

          <h2 className="text-left pt-2 my-4">Commentaires</h2>

          <CommentTreeTable comments={post.comments} />
        </>
      )}
    </>
  );
}

export default PostDetailPage;
