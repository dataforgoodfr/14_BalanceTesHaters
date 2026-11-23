import { Spinner } from "@/components/ui/spinner";
import type {
  PostCommentWithFlag,
  PostWithFlags,
} from "@/shared/model/post/Post";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";

type KpiCardsProps = {
  posts: PostWithFlags[] | undefined;
  isLoading: boolean;
  isHateful: (comment: PostCommentWithFlag) => boolean;
  commentLabel: string;
};

function KpiCards({
  posts,
  isLoading,
  isHateful,
  commentLabel,
}: Readonly<KpiCardsProps>) {
  const allComments = (posts || []).flatMap((p) => p.comments);
  const hatefulComments = allComments.filter(isHateful);
  const numberOfHatefulComments = hatefulComments.length;

  return (
    <>
      {isLoading && <Spinner className="size-8" />}
      {!posts && !isLoading && (
        <p className="mt-6">
          Aucun post collecté pour la période sélectionnée.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4">
        <PercentageHatefulCommentsKpiCard
          commentLabel={commentLabel}
          numberOfHatefulComments={numberOfHatefulComments}
          numberOfComments={allComments.length}
          isLoading={isLoading}
        />
        <NumberHatefulCommentsKpiCard
          commentLabel={commentLabel}
          numberOfHatefulComments={numberOfHatefulComments}
          numberOfComments={allComments.length}
          isLoading={isLoading}
        />
        <NumberHatefulAuhorsKpiCard
          commentLabel={commentLabel}
          hatefulCommentList={hatefulComments}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}

export default KpiCards;
