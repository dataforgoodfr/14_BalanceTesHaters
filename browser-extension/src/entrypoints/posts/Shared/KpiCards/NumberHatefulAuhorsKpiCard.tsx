import { PostComment } from "@/shared/model/post/Post";
import KpiCard from "./KpiCard";

type NumberHatefulAuhorsKpiCardProperties = {
  hatefulCommentList: PostComment[];
  isLoading: boolean;
};

export default function NumberHatefulAuhorsKpiCard({
  hatefulCommentList,
  isLoading,
}: Readonly<NumberHatefulAuhorsKpiCardProperties>) {
  const numberOfHatefulAuthors = new Set(
    hatefulCommentList.map((c) => c.author.name),
  ).size;

  return (
    <KpiCard
      title="Nombre d'auteurs des commentaires haineux"
      value={numberOfHatefulAuthors.toString()}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
