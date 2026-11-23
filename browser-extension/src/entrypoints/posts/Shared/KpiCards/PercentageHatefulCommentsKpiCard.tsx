import { getPercentage } from "@/shared/utils/maths";
import KpiCard from "./KpiCard";

type PercentageHatefulCommentsKpiCardProperties = {
  numberOfHatefulComments: number;
  numberOfComments: number;
  isLoading: boolean;
  commentLabel?: string;
};

export default function PercentageHatefulCommentsKpiCard({
  numberOfHatefulComments,
  numberOfComments,
  isLoading,
  commentLabel = "commentaires malveillants",
}: Readonly<PercentageHatefulCommentsKpiCardProperties>) {
  const percentageOfHatefulComments = getPercentage(
    numberOfHatefulComments,
    numberOfComments,
  );

  return (
    <KpiCard
      title={`Part des ${commentLabel}`}
      value={`${percentageOfHatefulComments.toFixed(2)}%`}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
