import { Button } from "@/components/ui/button";

export function ViewPreviousAnalysesButton() {
  const reportPageUrl = browser.runtime.getURL("/posts.html#/posts");
  return (
    <Button
      data-testid="view-analyses-button"
      className="w-full"
      variant="outline"
      render={
        <a href={reportPageUrl} target="bth-posts">
          Publications analysées
        </a>
      }
    ></Button>
  );
}
