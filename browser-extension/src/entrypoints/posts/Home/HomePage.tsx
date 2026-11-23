import { Tabs } from "@base-ui/react/tabs";
import { AI_SCORE_HATE_THRESHOLD } from "@/shared/constants/ai-score-hate-threshold";
import { COMMENT_STATISTICS_TABS } from "../Shared/commentStatistics";
import KpiCards from "./KpiCards";
import HarassmentTrendChart from "./HarassmentTrendChard";
import ActiveAuthors from "../Shared/ActiveAuthors";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import DateRangePicker from "./DateRangePicker";
import React from "react";
import { type DateRange } from "@daypicker/react";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { getEarliestPostDate } from "@/shared/utils/post-util";
import PageHeader from "../Shared/PageHeader";
import { main } from "../Menu";
import NoPost from "../Shared/NoPost";
import { useHomePagePostList } from "../Shared/useHomePagePostList";

function HomePage() {
  // selection state controlled by the page
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >([SocialNetwork.YouTube]);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  const { isLoading, filteredPosts } = useHomePagePostList(
    socialNetworkFilter,
    dateRange,
  );

  const allComments = (filteredPosts || []).flatMap((p) => p.comments);

  return (
    <main className="flex flex-col gap-4">
      <PageHeader menuEntry={main.menuEntries.Overview} />
      <div className="flex align-start">
        <SocialNetworkSelector
          value={socialNetworkFilter}
          onChange={setSocialNetworkFilter}
        />
      </div>
      <div className="flex justify-between">
        <div className="text-muted-foreground text-sm my-auto">
          Publications analysées pour la période sélectionnée :{" "}
          <span className="font-bold">{filteredPosts?.length}</span>
        </div>

        <DateRangePicker
          startDate={dateRange?.from || getEarliestPostDate(filteredPosts)}
          onChange={setDateRange}
        />
      </div>

      {allComments.length === 0 && !isLoading && <NoPost />}

      {allComments.length > 0 && (
        <Tabs.Root defaultValue="ai" className="flex flex-col gap-4">
          <Tabs.List
            aria-label="Source des statistiques"
            className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
          >
            {COMMENT_STATISTICS_TABS.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground outline-none data-active:bg-background data-active:text-foreground data-active:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
              >
                {allComments.filter(tab.isHateful).length} {tab.label}
                {tab.value === "ai" &&
                  ` (score > ${AI_SCORE_HATE_THRESHOLD * 100}%)`}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {COMMENT_STATISTICS_TABS.map((tab) => (
            <Tabs.Panel
              key={tab.value}
              value={tab.value}
              className="flex flex-col gap-4 outline-none"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="min-w-0">
                  <KpiCards
                    posts={filteredPosts}
                    isLoading={isLoading}
                    isHateful={tab.isHateful}
                    commentLabel={tab.label}
                  />
                </div>
                <div className="grid min-w-0 lg:col-span-2">
                  <ActiveAuthors
                    postComments={allComments}
                    isLoading={isLoading}
                    isHateful={tab.isHateful}
                    commentLabel={tab.label}
                  />
                </div>
              </div>
              <HarassmentTrendChart
                dateRange={dateRange}
                commentList={allComments}
                isLoading={isLoading}
                isHateful={tab.isHateful}
                commentLabel={tab.label}
              />
            </Tabs.Panel>
          ))}
        </Tabs.Root>
      )}
    </main>
  );
}

export default HomePage;
