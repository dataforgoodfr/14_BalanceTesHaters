import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";

function HarassmentTrendChart() {
  return (
    <Card className="w-full  relative mb-4">
      <CardHeader>Évolution de l&apos;harcèlement</CardHeader>
      <CardContent className="p-4">
        <WorkInProgress />
        <p>
          Graphique présentant le nombre de commentaires haineux au fil du temps
          à réaliser.
        </p>
      </CardContent>
    </Card>
  );
}

export default HarassmentTrendChart;
