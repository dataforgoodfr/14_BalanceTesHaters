import KpiCards from "./KpiCards";
import HarassmentTrendChart from "./HarassmentTrendChard";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import DateRangePicker from "./DateRangePicker";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import { type DateRange } from "react-day-picker";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { getEarliestPostDate } from "@/shared/utils/post-util";
import PageHeader from "../Shared/PageHeader";
import NoPost from "../Shared/NoPost";

function HomePage() {
  // selection state controlled by the page
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >([SocialNetwork.YouTube]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

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
    <main className="p-4 flex flex-col gap-6 w-full ">
      <PageHeader title="Vue d'ensemble" />
      <div className="flex justify-between ">
        <SocialNetworkSelector
          value={socialNetworkFilter}
          onChange={setSocialNetworkFilter}
        />
        <DateRangePicker
          startDate={dateRange?.from || getEarliestPostDate(data)}
          onChange={setDateRange}
        />
      </div>

      {allComments.length === 0 && !isLoading && <NoPost />}

      {allComments.length > 0 && (
        <>
          <KpiCards posts={data} isLoading={isLoading} />
          <HarassmentTrendChart
            dateRange={dateRange}
            commentList={allComments}
            isLoading={isLoading}
          />
          <div className="flex gap-4">
            <ActiveAuthors postComments={allComments} isLoading={isLoading} />
            <CategoryDistribution />
          </div>
        </>
      )}
    </main>
  );
}

export default HomePage;
