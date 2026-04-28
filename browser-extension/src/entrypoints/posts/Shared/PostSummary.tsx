"use server";
import DisplayPublishedDate from "../Posts/DisplayPublishedDate";
import { PublicationDate } from "@/shared/model/PublicationDate";

function PostSummary({
  coverImageUrl,
  title,
  publishedAt,
  url,
}: {
  url: string;
  coverImageUrl?: string;
  title?: string;
  publishedAt: PublicationDate;
}) {
  return (
    <div className="flex">
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          className="w-32 h-22 object-cover mr-4 rounded-2xl"
        />
      )}
      <div className="text-left flex flex-col items-start gap-1">
        <span className="font-medium text-base font-display">{title}</span>
        <span className="font-normal text-xs">
          URL:{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </span>
        <DisplayPublishedDate date={publishedAt} />
      </div>
    </div>
  );
}

export default PostSummary;
