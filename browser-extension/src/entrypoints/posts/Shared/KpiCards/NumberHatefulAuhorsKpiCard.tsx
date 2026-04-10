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
      title="Auteurs de commentaires malveillants"
      value={numberOfHatefulAuthors.toString()}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
