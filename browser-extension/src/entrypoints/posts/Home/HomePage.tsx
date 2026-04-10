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
import { FolderCode } from "lucide-react";

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
    <div className="p-4 flex flex-col gap-6 w-full">
      <h1 className="mt-2">Vue d&apos;ensemble</h1>
      <div className="flex justify-between ">
        <SocialNetworkSelector
          value={socialNetworkFilter}
          onChange={setSocialNetworkFilter}
        />
        <DateRangePicker
          startDate={getEarliestPostDate(data)}
          onChange={setDateRange}
        />
      </div>

      {allComments.length === 0 && !isLoading && (
        <div className="flex flex-col items-center max-w-xs mx-auto gap-1 ">
          <FolderCode className="bg-secondary p-2 w-8 h-8 rounded-md" />
          <div className="text-primary font-semibold">
            Aucune publication analysée
          </div>
          <div className="text-muted-foreground">
            Modifie la période ou lance une nouvelle analyse sur une publication
            YouTube/Instagram.
          </div>
        </div>
      )}

      {allComments.length > 0 && (
        <>
          <KpiCards posts={data} isLoading={isLoading} />

          <HarassmentTrendChart
            commentList={allComments}
            isLoading={isLoading}
          />
          <div className="flex gap-4">
            <ActiveAuthors postComments={allComments} isLoading={isLoading} />
            <CategoryDistribution />
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;
