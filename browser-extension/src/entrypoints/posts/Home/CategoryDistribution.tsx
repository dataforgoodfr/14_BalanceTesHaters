import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";
import { PostSnapshot } from "@/shared/model/PostSnapshot";

type CategoryDistributionProps = {
  posts: PostSnapshot[] | undefined;
  isLoading: boolean;
};

function CategoryDistribution({
  posts,
  isLoading,
}: Readonly<CategoryDistributionProps>) {
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
