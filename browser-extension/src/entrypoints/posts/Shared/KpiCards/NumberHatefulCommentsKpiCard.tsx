import KpiCard from "./KpiCard";

type NumberHatefulCommentsKpiCardProperties = {
  numberOfHatefulComments: number;
  numberOfComments: number;
  isLoading: boolean;
};

export default function NumberHatefulCommentsKpiCard({
  numberOfHatefulComments,
  numberOfComments,
  isLoading,
}: Readonly<NumberHatefulCommentsKpiCardProperties>) {
  return (
    <KpiCard
      title="Nombre de commentaires malveillants"
      value={`${numberOfHatefulComments.toString()}/${numberOfComments.toString()}`}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
