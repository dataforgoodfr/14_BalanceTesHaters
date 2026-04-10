import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PostComment } from "@/shared/model/post/Post";
import { getFirstDayOfWeek } from "@/shared/utils/date-util";
import { isCommentHateful } from "@/shared/utils/post-util";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

const MAX_DATA_POINTS = 60; // Maximum number of data points to display in the chart
const NB_DAY_IN_WEEK = 7; // Number of days in a week

type HarassmentTrendChartProps = {
  commentList: PostComment[];
  isLoading: boolean;
};

function getCommentChartDate(comment: PostComment): Date {
  let date: Date;
  switch (comment.publishedAt.type) {
    case "absolute":
      date = new Date(comment.publishedAt.date);
      date.setHours(0, 0, 0, 0);
      return date;
    case "relative":
      date = new Date(comment.publishedAt.resolvedDateRange.start);
      date.setHours(0, 0, 0, 0);
      return date;
    default:
      throw new Error(
        "Can't get chart date for comment with unknown publication date.",
      );
  }
}

function formatChartDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
}

function getAllDatesInCommentsRange(commentList: PostComment[]): Date[] {
  // Find the earliest and latest dates in the comment list
  const dates = commentList
    .filter((comment) => comment.publishedAt.type !== "unknown date")
    .map(getCommentChartDate);

  if (dates.length === 0) {
    return [];
  }

  const earliestDate: Date = new Date(
    Math.min(...dates.map((d) => d.getTime())),
  );
  earliestDate.setHours(0, 0, 0, 0);

  const latestDate: Date = new Date(Math.max(...dates.map((d) => d.getTime())));
  latestDate.setHours(0, 0, 0, 0);

  const result: Date[] = [];
  const current = new Date(earliestDate);

  while (current <= latestDate) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function aggregateByMonth(
  commentByDateAggregation: { date: Date; nombre: number }[],
): { date: string; nombre: number }[] {
  const monthMap = new Map<string, number>();

  for (const entry of commentByDateAggregation) {
    const monthLabel = entry.date.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });

    monthMap.set(monthLabel, (monthMap.get(monthLabel) ?? 0) + entry.nombre);
  }

  return Array.from(monthMap).map(([date, nombre]) => ({ date, nombre }));
}

function aggregateByWeek(
  commentByDateAggregation: { date: Date; nombre: number }[],
): { date: string; nombre: number }[] {
  const weekMap = new Map<string, number>();
  for (const entry of commentByDateAggregation) {
    const weekLabel = getFirstDayOfWeek(entry.date).toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "long",
      },
    );
    weekMap.set(weekLabel, (weekMap.get(weekLabel) ?? 0) + entry.nombre);
  }

  return Array.from(weekMap).map(([date, nombre]) => ({ date, nombre }));
}

function HarassmentTrendChart({
  commentList,
}: Readonly<HarassmentTrendChartProps>) {
  const chartConfig = {
    nombre: {
      label: "Nombre de commentaires malveillants",
    },
  } satisfies ChartConfig;

  const hatefulCommentList = commentList.filter((comment) =>
    isCommentHateful(comment),
  );

  const commentByDateAggregation: { date: Date; nombre: number }[] =
    getAllDatesInCommentsRange(hatefulCommentList).map((date) => ({
      date,
      nombre: 0,
    }));

  for (const comment of hatefulCommentList) {
    // We filter out comments with unknown publication date because we can't determine on which date to count them in the chart.
    if (comment.publishedAt.type !== "unknown date") {
      const commentDate = getCommentChartDate(comment);
      const entry = commentByDateAggregation.find(
        (d) => d.date.toISOString() === commentDate.toISOString(),
      );

      if (entry) {
        entry.nombre += 1;
      }
    }
  }

  const chartData: { date: string; nombre: number }[] = [];
  // Depending on the number of data points, we might want to aggregate the chart data by week or by month instead of by day to avoid displaying an unreadable chart
  if (commentByDateAggregation.length / NB_DAY_IN_WEEK > MAX_DATA_POINTS) {
    // By month
    chartData.push(...aggregateByMonth(commentByDateAggregation));
    console.log("chartData after month aggregation", chartData);
  } else if (commentByDateAggregation.length > MAX_DATA_POINTS) {
    // By week
    chartData.push(...aggregateByWeek(commentByDateAggregation));
    console.log("chartData after week aggregation", chartData);
  } else {
    // By day
    chartData.push(
      ...commentByDateAggregation.map((entry) => ({
        date: formatChartDate(entry.date),
        nombre: entry.nombre,
      })),
    );
  }

  return (
    <Card className="w-full min-h-100">
      <CardHeader>Évolution des commentaires malveillants</CardHeader>
      <CardContent className="p-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-75 w-full"
        >
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="nombre" fill="var(--primary)" radius={4} />
            <Tooltip />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default HarassmentTrendChart;
