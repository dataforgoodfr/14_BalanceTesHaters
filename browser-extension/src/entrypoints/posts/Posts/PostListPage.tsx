import React from "react";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import { Spinner } from "@/components/ui/spinner";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router";
import PostSummary from "../Shared/PostSummary";
import SearchSortFiltersPostList, {
  emptyFilters,
} from "../Shared/SearchSortFiltersPostList";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { openPostAndStartScraping } from "../../actions/openPostAndStartScraping";
import { RotateCwIcon } from "lucide-react";
import {
  DateFilterOptions,
  filterPosts,
  formatAnalysisDate,
  PostFilters,
} from "@/shared/utils/post-util";
import PageHeader from "../Shared/PageHeader";
import NoPost from "../Shared/NoPost";

function getStartPeriodFromFilters(filters: PostFilters): Date | undefined {
  if (filters.date.length === 0) {
    return undefined;
  }

  // We take the longest chosen range
  const startDate = new Date();
  if (filters.date.includes(DateFilterOptions.TWELVE_MONTHS)) {
    startDate.setMonth(startDate.getMonth() - 12);
  } else if (filters.date.includes(DateFilterOptions.THIRTY_DAYS)) {
    startDate.setDate(startDate.getDate() - 30);
  } else if (filters.date.includes(DateFilterOptions.SEVEN_DAYS)) {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    return undefined;
  }
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

function getEndPeriodFromFilters(filters: PostFilters): Date | undefined {
  if (filters.date.length === 0) {
    return undefined;
  } else {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    return endDate;
  }
}

function PostListPage() {
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >([SocialNetwork.YouTube]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [postFilters, setPostFilters] = React.useState(emptyFilters);
  const queryKey = ["posts", socialNetworkFilter, postFilters.date.join(",")];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getPostsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        getStartPeriodFromFilters(postFilters),
        getEndPeriodFromFilters(postFilters),
      ),
  });

  const filteredPosts = React.useMemo(() => {
    if (!data || data.length === 0) {
      return data || [];
    }

    return filterPosts(data, searchTerm, postFilters);
  }, [data, searchTerm, postFilters]);

  return (
    <main className="p-4 flex flex-col gap-6  items-start">
      <PageHeader title="Publications analysées" />
      <SocialNetworkSelector
        value={socialNetworkFilter}
        onChange={setSocialNetworkFilter}
      />
      <SearchSortFiltersPostList
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        postFilters={postFilters}
        setPostFilters={setPostFilters}
      />

      {isLoading && <Spinner className="size-8" />}
      {!isLoading && (!filteredPosts || filteredPosts.length === 0) && (
        <NoPost />
      )}

      <div className="flex flex-col gap-4">
        {filteredPosts &&
          filteredPosts.length > 0 &&
          filteredPosts.map((post) => (
            <Card key={post.postId}>
              <CardContent className="flex items-center gap-5">
                <Checkbox className="mr-2" />
                <div className="w-full">
                  <PostSummary post={post} />
                  <Card className="bg-muted mt-2 flex flex-row px-5 py-3 items-center justify-between">
                    <div className="font-semibold">
                      Analyse du {formatAnalysisDate(post.lastAnalysisDate)}
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void openPostAndStartScraping(post.url);
                        }}
                      >
                        <RotateCwIcon /> Relancer l&apos;analyse
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        render={
                          <Link
                            to={
                              "/posts/" + post.socialNetwork + "/" + post.postId
                            }
                          >
                            Voir le détail
                          </Link>
                        }
                      ></Button>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </main>
  );
}

export default PostListPage;
