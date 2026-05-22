import KpiCard from "./KpiCard";

type NumberHatefulCommentsKpiCardProperties = {
  numberOfHatefulComments: number;
  numberOfComments?: number;
  isLoading: boolean;
};

export default function NumberHatefulCommentsKpiCard({
  numberOfHatefulComments,
  numberOfComments,
  isLoading,
}: Readonly<NumberHatefulCommentsKpiCardProperties>) {
  const value = numberOfComments
    ? `${numberOfHatefulComments.toString()}/${numberOfComments.toString()}`
    : numberOfHatefulComments.toString();

  return (
    <KpiCard
      title="Nombre de commentaires malveillants"
      value={value}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
