import type { CommentScreenshotRef } from "@/shared/model/CommentScreenshot";
import { getScreenshot } from "@/shared/storage/post-snapshot-storage";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { Spinner } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";

export type CommentScreenshotImageProps = {
  screenshotRef?: CommentScreenshotRef;
  className?: string;
  alt: string;
  onClick?: (data: string) => void;
};

export function CommentScreenshotImage({
  screenshotRef,
  className,
  alt,
  onClick,
}: CommentScreenshotImageProps) {
  const query = useQuery({
    queryKey: [
      "comment-screenshot",
      screenshotRef?.postSnapshotId,
      screenshotRef?.commentSnapshotId,
    ],
    queryFn: () => getScreenshot(screenshotRef!),
    enabled: Boolean(screenshotRef),
    gcTime: 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (!screenshotRef) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  if (query.isLoading) {
    return <Spinner className="size-5" />;
  }
  const screenshotData = query.data;
  if (!screenshotData) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return (
    <img
      src={buildDataUrl(screenshotData, PNG_MIME_TYPE)}
      alt={alt}
      className={className}
      onClick={() => onClick?.(screenshotData)}
    />
  );
}
