import KpiCard from "./KpiCard";

type SecurityAlertProperties = {
  isLoading: boolean;
};

export default function SecurityAlert({
  isLoading,
}: Readonly<SecurityAlertProperties>) {

  return (
    <KpiCard
      title="Alerte sécurité"
      value="N/A"
      isWorkInProgress={true}
      isLoading={isLoading}
    ></KpiCard>
  );
}
