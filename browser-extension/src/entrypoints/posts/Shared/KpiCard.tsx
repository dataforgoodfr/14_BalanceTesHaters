import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import WorkInProgress from "../WorkInProgress";

type KpiCardProperties = {
  title: string;
  value: string;
  isWorkInProgress: boolean;
  isLoading: boolean;
};

function KpiCard({
  title,
  value,
  isWorkInProgress,
  isLoading,
}: Readonly<KpiCardProperties>) {
  return (
    <Card className="w-full gap-2 relative">
      <CardContent>
        <p className="text-lg text-gray-500 mb-0">{title}</p>
        {isLoading && <Spinner className="size-4" />}
        {!isLoading && value === "" && "/"}
        {!isLoading && value !== "" && (
          <p className="font-bold text-2xl">{value}</p>
        )}
        {isWorkInProgress && <WorkInProgress />}
      </CardContent>
    </Card>
  );
}

export default KpiCard;
