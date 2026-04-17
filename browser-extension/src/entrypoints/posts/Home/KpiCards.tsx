import { Spinner } from "@/components/ui/spinner";
import { isCommentHateful } from "@/shared/utils/post-util";
import { Post } from "@/shared/model/post/Post";
import KpiCard from "../Shared/KpiCards/KpiCard";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";

type KpiCardsProps = {
  posts: Post[] | undefined;
  isLoading: boolean;
};

function KpiCards({ posts, isLoading }: Readonly<KpiCardsProps>) {
  let numberOfHatefulComments = 0;

  const allComments = (posts || []).flatMap((p) => p.comments);
  const hatefulComments = allComments.filter((c) => isCommentHateful(c));
  if (allComments.length !== 0) {
    numberOfHatefulComments = hatefulComments.length;
  }

  return (
    <>
      {isLoading && <Spinner className="size-8" />}
      {!posts && !isLoading && (
        <p>Aucun post collecté pour la période sélectionnée.</p>
      )}
      <div className="flex gap-4 justify-between">
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
        <KpiCard
          title="Alerte sécurité"
          value="N/A"
          isWorkInProgress={true}
          isLoading={isLoading}
        ></KpiCard>
        <NumberHatefulAuhorsKpiCard
          hatefulCommentList={hatefulComments}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}

export default KpiCards;
