import KpiCard from "./KpiCard";

type NumberHatefulCommentsKpiCardProperties = {
  numberOfHatefulComments: number;
  numberOfComments?: number;
  isLoading: boolean;
  commentLabel?: string;
};

export default function NumberHatefulCommentsKpiCard({
  numberOfHatefulComments,
  numberOfComments,
  isLoading,
  commentLabel = "commentaires malveillants",
}: Readonly<NumberHatefulCommentsKpiCardProperties>) {
  const value = numberOfComments
    ? `${numberOfHatefulComments.toString()}/${numberOfComments.toString()}`
    : numberOfHatefulComments.toString();

  return (
    <KpiCard
      title={`Nombre de ${commentLabel}`}
      value={value}
      isWorkInProgress={false}
      isLoading={isLoading}
    ></KpiCard>
  );
}
