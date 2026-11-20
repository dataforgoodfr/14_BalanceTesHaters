import { Spinner } from "@/components/ui/spinner";
import type { PostWithFlags } from "@/shared/model/post/Post";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";

type KpiCardsProps = {
  posts: PostWithFlags[] | undefined;
  isLoading: boolean;
};

function KpiCards({ posts, isLoading }: Readonly<KpiCardsProps>) {
  let numberOfHatefulComments = 0;

  const allComments = (posts || []).flatMap((p) => p.comments);
  const hatefulComments = allComments.filter((c) => c.isFlagged);
  if (allComments.length !== 0) {
    numberOfHatefulComments = hatefulComments.length;
  }

  return (
    <>
      {isLoading && <Spinner className="size-8" />}
      {!posts && !isLoading && (
        <p className="mt-6">
          Aucun post collecté pour la période sélectionnée.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PercentageHatefulCommentsKpiCard
          numberOfHatefulComments={numberOfHatefulComments}
          numberOfComments={allComments.length}
          isLoading={isLoading}
        />
        <NumberHatefulCommentsKpiCard
          numberOfHatefulComments={numberOfHatefulComments}
          numberOfComments={allComments.length}
          isLoading={isLoading}
        />
        <NumberHatefulAuhorsKpiCard
          hatefulCommentList={hatefulComments}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}

export default KpiCards;
