import { PostComment } from "@/shared/model/post/Post";
import KpiCard from "./KpiCard";
import { getNumberOfHatefulAuthors } from "@/shared/utils/report-stats";

type NumberHatefulAuhorsKpiCardProperties = {
  hatefulCommentList: PostComment[];
  isLoading: boolean;
};

export default function NumberHatefulAuhorsKpiCard({
  hatefulCommentList,
  isLoading,
}: Readonly<NumberHatefulAuhorsKpiCardProperties>) {
  const numberOfHatefulAuthors = getNumberOfHatefulAuthors(hatefulCommentList);

  return (
    <KpiCard
      title="Auteurs de commentaires malveillants"
      value={numberOfHatefulAuthors.toString()}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
