import { Button } from "@/components/ui/button";

export function ViewPreviousAnalysesButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const postsListUrl = browser.runtime.getURL("/posts.html#/posts");
  return (
    <Button
      data-testid="view-analyses-button"
      className="w-full"
      variant="outline"
      disabled={disabled}
      render={
        <a href={postsListUrl} target="bth-posts">
          Publications analysées
        </a>
      }
    ></Button>
  );
}
