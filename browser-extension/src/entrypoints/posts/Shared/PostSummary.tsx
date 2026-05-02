"use server";
import { Post } from "@/shared/model/post/Post";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { isCommentHateful } from "@/shared/utils/post-util";

function PostSummary({ post }: { post: Post }) {
  const hatefulCommentsCount =
    post.latestAnalysisStatus === "COMPLETED"
      ? post.comments.filter(isCommentHateful).length
      : undefined;
  return (
    <div className="flex">
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt=""
          className="w-32 h-22 object-cover mr-4 rounded-2xl"
        />
      )}
      <div className="text-left flex flex-col items-start gap-1">
        <span className="font-medium text-base font-display">{post.title}</span>
        <span className="font-normal text-xs">
          URL:{" "}
          <a href={post.url} target="_blank" rel="noopener noreferrer">
            {post.url}
          </a>
        </span>
        <span className="text-xs text-muted-foreground">
          {publishedAtText(post.publishedAt)} • {""}
          {hatefulCommentsCount === undefined ? (
            <>{post.comments.length} commentaires</>
          ) : (
            <>
              {hatefulCommentsCount}/{post.comments.length} commentaires
              malveillants
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function publishedAtText(at: PublicationDate): string {
  switch (at.type) {
    case "absolute":
      return `Publiée le ${formatDate(at.date)}`;
    case "relative":
      return `Publiée entre le ${formatDate(at.resolvedDateRange.start)} et le ${formatDate(at.resolvedDateRange.end)}`;
    case "unknown date":
      return `Publiée  à une date inconnue`;
  }
}

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default PostSummary;
