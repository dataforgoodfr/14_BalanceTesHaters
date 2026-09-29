import { commentScreenshotRefKey } from "@/shared/model/CommentScreenshot";
import { useEffect, useRef, useState } from "react";
import {
  CommentScreenshotImage,
  type CommentScreenshotImageProps,
} from "./CommentScreenshotImage";

type LazyCommentScreenshotImageProps = CommentScreenshotImageProps;

export function LazyCommentScreenshotImage({
  screenshotRef,
  className,
  alt,
  onClick,
}: LazyCommentScreenshotImageProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const refKey = screenshotRef
    ? commentScreenshotRefKey(screenshotRef)
    : undefined;
  const [visibleRefKey, setVisibleRefKey] = useState<string>();
  const shouldRender = refKey !== undefined && visibleRefKey === refKey;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !refKey) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisibleRefKey(refKey);
        observer.disconnect();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [refKey]);

  return (
    <span
      ref={containerRef}
      className="inline-flex min-h-10 min-w-10 items-center justify-center"
    >
      {!screenshotRef || shouldRender ? (
        <CommentScreenshotImage
          screenshotRef={screenshotRef}
          alt={alt}
          className={className}
          onClick={onClick}
        />
      ) : null}
    </span>
  );
}
