import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PostComment } from "@/shared/model/post/Post";
import { getPercentage } from "@/shared/utils/maths";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  BarShapeProps,
  Cell,
  LabelList,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import { isCommentHateful } from "@/shared/utils/post-util";

const MAX_AUTHORS_TO_DISPLAY = 10; // Nombre maximum d'auteurs à afficher dans la liste des auteurs actifs

type AuthorStats = {
  name: string;
  numberOfComments: number;
  numberOfHatefulComments: number;
};

type ActiveAuthorsProps = {
  postComments: PostComment[];
  isLoading: boolean;
};

function ActiveAuthors({
  postComments,
  isLoading,
}: Readonly<ActiveAuthorsProps>) {
  const totalHatefulCommentNumber = postComments.filter((comment) =>
    isCommentHateful(comment),
  ).length;

  const authorStatsList = postComments
    .reduce((authorStatsList: AuthorStats[], currentComment) => {
      const existingAuthorIndex = authorStatsList.findIndex(
        (author) => author.name === currentComment.author.name,
      );

      // Si l'auteur n'est pas encore dans la liste des commentaires les plus récents, on l'ajoute
      if (existingAuthorIndex === -1) {
        authorStatsList.push({
          name: currentComment.author.name,
          numberOfComments: 1,
          numberOfHatefulComments: isCommentHateful(currentComment) ? 1 : 0,
        });
      } else {
        // Si l'auteur est déjà dans la liste, on incrémente le nombre de commentaires
        authorStatsList[existingAuthorIndex].numberOfComments += 1;
        if (isCommentHateful(currentComment)) {
          authorStatsList[existingAuthorIndex].numberOfHatefulComments += 1;
        }
      }
      return authorStatsList;
    }, [])
    .filter((authorStats) => authorStats.numberOfHatefulComments >= 1) // ne garder que les auteurs avec au moins 1 commentaire haineux;
    .sort(
      // trier par nombre de commentaires haineux décroissant
      (a, b) => b.numberOfHatefulComments - a.numberOfHatefulComments,
    )
    .slice(0, MAX_AUTHORS_TO_DISPLAY)
    .map((authorStats) => ({
      name: authorStats.name,
      nombre: authorStats.numberOfHatefulComments,
      hatefulCommentRatio:
        getPercentage(
          authorStats.numberOfHatefulComments,
          totalHatefulCommentNumber,
        ).toFixed(2) + "%",
    }));

  const chartConfig = {
    nombre: {
      label: "Commentaires malveillants",
    },
    name: {
      label: "Auteurs",
    },
    hatefulCommentRatio: {
      label: "Ratio de commentaires malveillants",
    },
  } satisfies ChartConfig;

  return (
    <Card className="w-full relative">
      <CardHeader>Principaux auteurs de commentaires malveillants</CardHeader>
      <CardContent className="">
        {isLoading && <Spinner className="size-8" />}

        {!isLoading && (
          <ChartContainer config={chartConfig} className="aspect-auto h-75 ">
            <BarChart
              accessibilityLayer
              data={authorStatsList}
              layout="vertical"
            >
              <XAxis dataKey="nombre" type="number" />
              <YAxis
                className="break-all"
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={100} //TODO : find a way to adapt the width of the YAxis to the length of the author names without hardcoding a width value
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="nombre"
                fill="var(--primary)"
                radius={4}
                shape={ColoredRectangle}
              >
                <LabelList
                  dataKey="hatefulCommentRatio"
                  position="insideRight"
                  fill="var(--primary-foreground)"
                />
              </Bar>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    className="max-w-1/12 text-left "
                  />
                }
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const ColoredRectangle = (props: BarShapeProps) => {
  return (
    <Rectangle
      {...props}
      fill={`oklch(0.5039 0.2196 273.78 / ${0.2 + (props.index * 0.8) / 10})`}
    />
  );
};

export default ActiveAuthors;
