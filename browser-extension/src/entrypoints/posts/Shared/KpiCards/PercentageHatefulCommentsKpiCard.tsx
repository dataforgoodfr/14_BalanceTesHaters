import { getPercentage } from "@/shared/utils/maths";
import KpiCard from "./KpiCard";

type PercentageHatefulCommentsKpiCardProperties = {
  numberOfHatefulComments: number;
  numberOfComments: number;
  isLoading: boolean;
};

export default function PercentageHatefulCommentsKpiCard({
  numberOfHatefulComments,
  numberOfComments,
  isLoading,
}: Readonly<PercentageHatefulCommentsKpiCardProperties>) {

  const percentageOfHatefulComments = getPercentage(
        numberOfHatefulComments,
        numberOfComments,
      );
      
  return (
    <KpiCard
      title="Part des commentaires haineux"
      value={`${percentageOfHatefulComments.toFixed(2)}%`}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
