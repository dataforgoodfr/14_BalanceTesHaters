import KpiCards from "./KpiCards";
import HarassmentTrendChart from "./HarassmentTrendChard";
import ActiveAuthors from "./ActiveAuthors";
import CategoryDistribution from "./CategoryDistribution";
import SocialNetworkSelector from "./SocialNetworkSelector";
import DateRangePicker from "./DateRangePicker";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostSnapshotsBySocialNetworkAndPeriod } from "@/shared/storage/post-snapshot-storage";
import { addMonths } from "date-fns";
import { type DateRange } from "react-day-picker";

function HomePage() {
  // selection state controlled by the page
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >(["YOUTUBE"]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: addMonths(new Date(), -3),
    to: new Date(),
  });

  const queryKey = [
    "posts",
    socialNetworkFilter,
    dateRange?.from?.toISOString() ?? "",
    dateRange?.to?.toISOString() ?? "",
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getPostSnapshotsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        dateRange?.from,
        dateRange?.to,
      ),
  });

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="mt-2">Vue d&apos;ensemble</h1>
      <div className="flex justify-between ">
        <SocialNetworkSelector
          value={socialNetworkFilter}
          onChange={setSocialNetworkFilter}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <KpiCards posts={data} isLoading={isLoading} />

      <HarassmentTrendChart />
      <div className="flex gap-4">
        <ActiveAuthors posts={data} isLoading={isLoading} />
        <CategoryDistribution />
      </div>
    </div>
  );
}

export default HomePage;
