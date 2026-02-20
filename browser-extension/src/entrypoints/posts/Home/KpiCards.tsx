import { Card, CardContent } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";

function KpiCards() {
  return (
    <div className="flex gap-4 justify-between">
      <KpiCard
        title="Part des commentaires haineurs"
        value="6%"
        isWorkInProgress={true}
      ></KpiCard>
      <KpiCard
        title="Nombre de commentaires haineux"
        value="21/320"
        isWorkInProgress={true}
      ></KpiCard>
      <KpiCard
        title="Gravité"
        value="Modérée"
        isWorkInProgress={true}
      ></KpiCard>
      <KpiCard
        title="Nombre d'auteurs des commentaires haineux"
        value="6"
        isWorkInProgress={true}
      ></KpiCard>
    </div>
  );
}

type KpiCardProperties = {
  title: string;
  value: string;
  isWorkInProgress: boolean;
};

function KpiCard({
  title,
  value,
  isWorkInProgress,
}: Readonly<KpiCardProperties>) {
  return (
    <Card className="w-full gap-2 relative">
      <CardContent>
        <p className="text-lg text-gray-500 mb-0">{title}</p>
        <p className="font-bold text-2xl">{value}</p>
        {isWorkInProgress && <WorkInProgress />}
      </CardContent>
    </Card>
  );
}

export default KpiCards;
