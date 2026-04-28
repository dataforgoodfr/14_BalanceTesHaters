import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import WorkInProgress from "../../WorkInProgress";

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
    <Card className="w-full gap-2 relative pt-4 pb-4 text-left">
      <CardHeader className="pb-3 min-h-12">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="font-semibold text-3xl font-display">
        {isLoading && <Spinner className="size-9" />}
        {!isLoading && value === "" && "/"}
        {!isLoading && value !== "" && <>{value}</>}
        {isWorkInProgress && <WorkInProgress />}
      </CardContent>
    </Card>
  );
}

export default KpiCard;
