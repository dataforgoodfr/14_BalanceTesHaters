import { useEffect, useState } from "react";
import { getPostByIdAndScrapedAt } from "@/shared/storage/posts-storage";
import { Post } from "@/shared/model/post";
import { useParams } from "react-router";
import { CommentTreeTable } from "./CommentTreeTable";

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

          <h2 className="text-left pt-2 mb-4">Commentaires</h2>

          <CommentTreeTable comments={post.comments} />
        </>
      )}
    </>
  );
}

export default PostDetailPage;
