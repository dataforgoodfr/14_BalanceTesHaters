import { Spinner } from "@/components/ui/spinner";
import { isCommentHateful } from "@/shared/utils/post-util";
import { getPercentage } from "@/shared/utils/maths";
import { Post } from "@/shared/model/post/Post";
import KpiCard from "../Shared/KpiCard";

type KpiCardsProps = {
  posts: Post[] | undefined;
  isLoading: boolean;
};

function KpiCards({ posts, isLoading }: Readonly<KpiCardsProps>) {
  let percentageOfHatefulComments = 0;
  let numberOfHatefulComments = 0;
  let numberOfHatefulAuthors = 0;

  const allComments = (posts || []).flatMap((p) => p.comments);
  if (allComments.length !== 0) {
    const hatefulComments = allComments.filter((c) => isCommentHateful(c));
    numberOfHatefulComments = hatefulComments.length;
    percentageOfHatefulComments = getPercentage(
      numberOfHatefulComments,
      allComments.length,
    );
    numberOfHatefulAuthors = new Set(hatefulComments.map((c) => c.author.name))
      .size;
  }

  return (
    <>
      {isLoading && <Spinner className="size-8" />}
      {!posts && !isLoading && (
        <p>Aucun post collecté pour la période sélectionnée.</p>
      )}
      <div className="flex gap-4 justify-between">
        <KpiCard
          title="Part des commentaires haineux"
          value={percentageOfHatefulComments.toFixed(2) + "%"}
          isWorkInProgress={false}
          isLoading={isLoading}
        ></KpiCard>
        <KpiCard
          title="Nombre de commentaires haineux"
          value={`${numberOfHatefulComments.toString()}/${allComments.length.toString()}`}
          isWorkInProgress={false}
          isLoading={isLoading}
        ></KpiCard>
        <KpiCard
          title="Gravité"
          value="Modérée"
          isWorkInProgress={true}
          isLoading={isLoading}
        ></KpiCard>
        <KpiCard
          title="Nombre d'auteurs des commentaires haineux"
          value={numberOfHatefulAuthors.toString()}
          isWorkInProgress={false}
          isLoading={isLoading}
        ></KpiCard>
      </div>
    </>
  );
}

export default KpiCards;
