import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PostComment } from "@/shared/model/post/Post";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pie, PieChart } from "recharts";
import { Info } from "lucide-react";
import { getCategoryStats } from "@/shared/utils/report-stats";

const CATEGORY_COLORS = [
  "oklch(from var(--primary) 0.76 c h)",
  "oklch(from var(--primary) 0.68 c h)",
  "oklch(from var(--primary) 0.60 c h)",
  "var(--primary)",
  "oklch(from var(--primary) 0.41 c h)",
  "oklch(from var(--primary) 0.33 c h)",
  "oklch(from var(--primary) 0.25 c h)",
];

type CategoryDistributionProps = {
  postComments: PostComment[];
  isLoading: boolean;
};

type ChartDataPoint = {
  name: string;
  value: number;
  fill: string;
};

function CategoryDistribution({
  postComments,
  isLoading,
}: Readonly<CategoryDistributionProps>) {
  const categoryStats = getCategoryStats(postComments);
  const total = categoryStats.reduce((sum, s) => sum + s.count, 0);

  const dataPoints: ChartDataPoint[] = categoryStats.map((s, i) => ({
    name: s.label,
    value: s.count,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const chartConfig = dataPoints.reduce<ChartConfig>(
    (acc, d) => {
      acc[d.name] = { label: d.name, color: d.fill };
      return acc;
    },
    {
      commentsCount: {
        label: "Commentaires malveillants",
      },
    },
  ) satisfies ChartConfig;

  return (
    <Card className="w-full relative self-start">
      <CardHeader>
        <CardTitle className="text-left text-muted-forground font-display font-medium flex items-center gap-1">
          Répartition par catégories
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56">
              Répartition des commentaires par type d&apos;infraction. Voir le
              détail des catégories dans Aide et ressources.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Spinner className="size-8" />}

        {!isLoading && dataPoints.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun commentaire malveillant.
          </p>
        )}

        {!isLoading && dataPoints.length > 0 && (
          <div className="flex items-center gap-6">
            <ChartContainer
              config={chartConfig}
              className="aspect-square h-48 shrink-0"
            >
              <PieChart>
                <Pie
                  data={dataPoints}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  strokeWidth={0}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelKey="name"
                      nameKey="commentsCount"
                      className="text-left"
                    />
                  }
                />
              </PieChart>
            </ChartContainer>

            <ul className="flex flex-col gap-1.5 text-xs min-w-0 ">
              {dataPoints.map((d) => (
                <li
                  key={d.name}
                  className="flex flex-row items-center gap-2 text-left"
                >
                  <div
                    className="size-2 shrink-0 rounded-full "
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="flex-1 text-muted-foreground">{d.name}</span>
                  <span className="ml-auto whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-medium tabular-nums text-muted-foreground">
                    {((d.value / total) * 100).toLocaleString("fr-FR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                    %
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CategoryDistribution;
