import { Button } from "@/components/ui/button";
import { getPostsListUrl } from "@/shared/extension-urls";

export function ViewPreviousAnalysesButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  return (
    <Button
      size="lg"
      data-testid="view-analyses-button"
      className="w-full"
      variant="outline"
      disabled={disabled}
      render={
        <a href={getPostsListUrl()} target="bth-posts">
          Publications analysées
        </a>
      }
    ></Button>
  );
}
