import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";

function CategoryDistribution() {
  return (
    <Card className="w-full relative">
      <CardHeader>Répartition par catégories</CardHeader>
      <CardContent className="p-4">
        <WorkInProgress />
        <p>
          Graphique circulaire présentant la répartition des commentaires par
          catégorie.
        </p>
      </CardContent>
    </Card>
  );
}

export default CategoryDistribution;
