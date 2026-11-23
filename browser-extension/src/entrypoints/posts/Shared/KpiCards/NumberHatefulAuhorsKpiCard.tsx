import type { PostComment } from "@/shared/model/post/Post";
import KpiCard from "./KpiCard";
import { getNumberOfHatefulAuthors } from "@/shared/utils/report-stats";

type NumberHatefulAuhorsKpiCardProperties = {
  hatefulCommentList: PostComment[];
  isLoading: boolean;
  commentLabel?: string;
};

export default function NumberHatefulAuhorsKpiCard({
  hatefulCommentList,
  isLoading,
  commentLabel = "commentaires malveillants",
}: Readonly<NumberHatefulAuhorsKpiCardProperties>) {
  const numberOfHatefulAuthors = getNumberOfHatefulAuthors(hatefulCommentList);

  return (
    <KpiCard
      title={`Auteurs de ${commentLabel}`}
      value={numberOfHatefulAuthors.toString()}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
