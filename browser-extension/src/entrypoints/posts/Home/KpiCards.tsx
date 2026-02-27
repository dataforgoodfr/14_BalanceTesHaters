import { Card, CardContent } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { Spinner } from "@/components/ui/spinner";
import { IsCommentHateful } from "@/shared/utils/post-util";

type KpiCardsProps = {
  posts: PostSnapshot[] | undefined;
  isLoading: boolean;
};

function KpiCards({ posts, isLoading }: Readonly<KpiCardsProps>) {
  let percentageOfHatefulComments = 0;
  let numberOfHatefulComments = 0;
  let numberOfHatefulAuthors = 0;

  const allComments = posts?.flatMap((post) => post.comments) ?? [];

  if (allComments.length !== 0) {
    const hatefulComments = allComments.filter((c) => IsCommentHateful(c));
    numberOfHatefulComments = hatefulComments.length;
    percentageOfHatefulComments =
      (numberOfHatefulComments / allComments.length) * 100;
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

type KpiCardProperties = {
  title: string;
  value: string;
  isWorkInProgress: boolean;
  isLoading: boolean;
};

function KpiCard({
  title,
  value,
  isWorkInProgress,
  isLoading,
}: Readonly<KpiCardProperties>) {
  return (
    <Card className="w-full gap-2 relative">
      <CardContent>
        <p className="text-lg text-gray-500 mb-0">{title}</p>
        {isLoading && <Spinner className="size-4" />}
        {!isLoading && value === "" && "/"}
        {!isLoading && value !== "" && (
          <p className="font-bold text-2xl">{value}</p>
        )}
        {isWorkInProgress && <WorkInProgress />}
      </CardContent>
    </Card>
  );
}

export default KpiCards;
