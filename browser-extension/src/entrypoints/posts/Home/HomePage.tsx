import KpiCards from "./KpiCards";
import HarassmentTrendChart from "./HarassmentTrendChard";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import DateRangePicker from "./DateRangePicker";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
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
      getPostsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        dateRange?.from,
        dateRange?.to,
      ),
  });

  const allComments = (data || []).flatMap((p) => p.comments);


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
        <ActiveAuthors postComments={allComments} isLoading={isLoading} />
        <CategoryDistribution />
      </div>
    </div>
  );
}

export default HomePage;
