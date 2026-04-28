import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";

function CategoryDistribution() {
  return (
    <Card className="w-full relative">
      <CardHeader>
        <CardTitle className="text-left text-muted-forground font-display font-medium">
          Répartition par catégories
        </CardTitle>
      </CardHeader>
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
