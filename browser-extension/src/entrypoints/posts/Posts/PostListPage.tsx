import React from "react";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router";
import PostSummary from "../Shared/PostSummary";
import SearchSortFiltersPostList from "../Shared/SearchSortFiltersPostList";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { openPostAndStartScraping } from "../../actions/openPostAndStartScraping";
import { EyeIcon, RotateCwIcon } from "lucide-react";
import { formatAnalysisDate } from "@/shared/utils/post-util";
import PageHeader from "../Shared/PageHeader";
import NoPost from "../Shared/NoPost";
import { useFilteredPostList } from "../Shared/useFilteredPostList";

function PostListPage() {
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >([SocialNetwork.YouTube]);

  const {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    isLoading,
    filteredPosts,
  } = useFilteredPostList(socialNetworkFilter);

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

      <div className="flex flex-col gap-4 w-full">
        {filteredPosts &&
          filteredPosts.length > 0 &&
          filteredPosts.map((post) => (
            <Card key={post.postId} className="w-full">
              <CardContent className="flex items-center gap-5">
                <Checkbox className="mr-2" />
                <div className="w-full">
                  <PostSummary
                    url={post.url}
                    publishedAt={post.publishedAt}
                    title={post.title}
                    coverImageUrl={post.coverImageUrl}
                  />
                  <div className="mt-2 rounded-2xl bg-muted flex flex-row px-6 py-2 items-center justify-between bg-navigation-accent/50 border">
                    <div className="text-sm font-medium">
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
                            <EyeIcon /> Consulter
                          </Link>
                        }
                      ></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </main>
  );
}

export default PostListPage;
