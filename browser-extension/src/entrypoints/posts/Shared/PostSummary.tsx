import { AI_SCORE_HATE_THRESHOLD } from "@/shared/constants/ai-score-hate-threshold";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { PostWithFlags } from "@/shared/model/post/Post";
import type { PublicationDate } from "@/shared/model/PublicationDate";
import { getSocialNetworkName } from "@/shared/utils/post-util";

function PostSummary({ post }: { post: PostWithFlags }) {
  const aiSuspectedCommentsCount = post.comments.filter(
    (comment) =>
      comment.hateScore !== undefined &&
      comment.hateScore > AI_SCORE_HATE_THRESHOLD,
  ).length;
  const flaggedCommentsCount = post.comments.filter(
    (comment) => comment.isFlagged,
  ).length;
  return (
    <div className="flex w-full">
      <div className="grow flex">
        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt=""
            className="w-32 h-22 object-cover mr-4 rounded-2xl"
          />
        )}
        <div className="text-left flex flex-col items-start gap-1">
          <span className="font-medium text-base font-display">
            {post.title}
          </span>
          <span className="font-normal text-xs">
            URL:{" "}
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              {post.url}
            </a>
          </span>
          <span className="text-xs text-muted-foreground">
            {publishedAtText(post.publishedAt)} • {post.comments.length}{" "}
            commentaires
            {" • "}
            {aiSuspectedCommentsCount} suspecté
            {aiSuspectedCommentsCount !== 1 ? "s" : ""} par l'IA
            {" • "}
            {flaggedCommentsCount} marqué{flaggedCommentsCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="flex-none text-right text-muted-foreground whitespace-nowrap">
        {post.latestAnalysisStatus === "COMPLETED" ? (
          <Badge variant="outline">
            {getSocialNetworkName(post.socialNetwork)}
          </Badge>
        ) : (
          <Badge variant="outline">
            <Spinner />
            En cours
          </Badge>
        )}
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
      return `Publiée à une date inconnue`;
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
