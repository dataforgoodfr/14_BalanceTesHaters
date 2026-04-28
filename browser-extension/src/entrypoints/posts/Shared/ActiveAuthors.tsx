import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PostComment } from "@/shared/model/post/Post";
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
  LabelList,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import { getHatefulAuthorStatsList } from "@/shared/utils/report-stats";

const MAX_AUTHORS_TO_DISPLAY = 10; // Nombre maximum d'auteurs à afficher dans la liste des auteurs actifs

type ActiveAuthorsProps = {
  postComments: PostComment[];
  isLoading: boolean;
};

type ChartDataPoint = {
  authorName: string;
  hatefulCommentsCount: number;
  hatefulContributionPercentageLabel: string;
};
function ActiveAuthors({
  postComments,
  isLoading,
}: Readonly<ActiveAuthorsProps>) {
  const dataPoints: ChartDataPoint[] = getHatefulAuthorStatsList(
    postComments,
    MAX_AUTHORS_TO_DISPLAY,
  ).map((s) => ({
    authorName: s.authorName,
    hatefulCommentsCount: s.hatefulCommentsCount,
    hatefulContributionPercentageLabel:
      s.hateContributionPercentage.toFixed(2) + "%",
  }));

  const chartConfig = {
    hatefulCommentsCount: {
      label: "Commentaires malveillants",
    },
    authorName: {
      label: "Auteurs",
    },
    hatefulContributionPercentageLabel: {
      label: "Ratio de commentaires malveillants",
    },
  } satisfies ChartConfig;

  return (
    <Card className="w-full relative">
      <CardHeader>
        <CardTitle className="text-left text-muted-forground font-display font-medium">
          Principaux auteurs de commentaires malveillants
        </CardTitle>
      </CardHeader>
      <CardContent className="">
        {isLoading && <Spinner className="size-8" />}

        {!isLoading && (
          <ChartContainer config={chartConfig} className="aspect-auto h-75 ">
            <BarChart accessibilityLayer data={dataPoints} layout="vertical">
              <XAxis dataKey="hatefulCommentsCount" type="number" />
              <YAxis
                className="break-all"
                dataKey="authorName"
                type="category"
                tickLine={false}
                axisLine={false}
                width={100} //TODO : find a way to adapt the width of the YAxis to the length of the author names without hardcoding a width value
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="hatefulCommentsCount"
                fill="var(--primary)"
                radius={4}
                shape={ColoredRectangle}
              >
                <LabelList
                  dataKey="hatefulContributionPercentageLabel"
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
