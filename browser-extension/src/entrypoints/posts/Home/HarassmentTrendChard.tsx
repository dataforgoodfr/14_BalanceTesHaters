import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";
import { PostSnapshot } from "@/shared/model/PostSnapshot";

type HarassmentTrendChartProps = {
  posts: PostSnapshot[] | undefined;
  isLoading: boolean;
};

function HarassmentTrendChart({ posts, isLoading }: Readonly<HarassmentTrendChartProps>) {
  // placeholder - use `posts` to build chart
  return (
    <Card className="w-full relative">
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
