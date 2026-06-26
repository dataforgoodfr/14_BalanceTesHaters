import React from "react";
import SocialNetworkSelector from "../Shared/SocialNetworkSelector";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router";
import PostSummary from "../Shared/PostSummary";
import SearchSortFiltersPostList from "../Shared/SearchSortFiltersPostList";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { openPostAndStartScraping } from "../../actions/openPostAndStartScraping";
import { EyeIcon, RotateCwIcon, Trash2Icon } from "lucide-react";
import {
  formatAnalysisDate,
  PostSortingCategory,
} from "@/shared/utils/post-util";
import PageHeader from "../Shared/PageHeader";
import NoPost from "../Shared/NoPost";
import { useFilteredPostList } from "../Shared/useFilteredPostList";
import { cn } from "@/lib/utils";

function PostListPage() {
  const [socialNetworkFilter, setSocialNetworkFilter] = React.useState<
    string[]
  >([SocialNetwork.YouTube]);
  const [postSortingCategory, setPostSortingCategory] =
    React.useState<PostSortingCategory>(PostSortingCategory.ANALYSIS_DATE_DESC);
  const [selectedPostIds, setSelectedPostIds] = React.useState<string[]>([]);
  const {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    isLoading,
    filteredPosts,
    deletePost,
  } = useFilteredPostList(socialNetworkFilter, postSortingCategory);

  const navigate = useNavigate();

  return (
    <main className="flex flex-col gap-4  items-start">
      <PageHeader title="Publications analysées" />
      <SocialNetworkSelector
        value={socialNetworkFilter}
        onChange={setSocialNetworkFilter}
      />

      {selectedPostIds.length > 0 && (
        <div className="flex gap-3 justify-start  w-full">
          <div className="mb-3 pe-2 w-fit gap-1 bg-muted rounded-md flex items-center justify-start font-semibold ">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedPostIds([]);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Déselectionner toutes les publications"
            >
              ✕
            </Button>
            <span className="text-sm">
              {selectedPostIds.length} sélectionné
              {selectedPostIds.length > 1 ? "s" : ""}
            </span>
          </div>

          <Button
            onClick={() => {
              void navigate("/build-report", {
                state: {
                  selectedPostIds,
                  socialNetworkFilter,
                  skipToStep: "step-3",
                },
              });
            }}
          >
            Créer un rapport
          </Button>
        </div>
      )}

      <SearchSortFiltersPostList
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        postFilters={postFilters}
        setPostFilters={setPostFilters}
        postSortingCategory={postSortingCategory}
        setPostSortingCategory={setPostSortingCategory}
        selectAll={() => {
          setSelectedPostIds(filteredPosts.map((post) => post.postId));
        }}
      />

      {isLoading && <Spinner className="size-8" />}
      {!isLoading && (!filteredPosts || filteredPosts.length === 0) && (
        <NoPost />
      )}

      <div className="flex flex-col gap-4 w-full">
        {filteredPosts &&
          filteredPosts.length > 0 &&
          filteredPosts.map((post) => (
            <label key={post.postId} className="w-full">
              <Card key={post.postId}>
                <CardContent className="flex items-center gap-5">
                  <Checkbox
                    className="mr-2"
                    checked={selectedPostIds.includes(post.postId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPostIds([...selectedPostIds, post.postId]);
                      } else {
                        setSelectedPostIds(
                          selectedPostIds.filter((id) => id !== post.postId),
                        );
                      }
                    }}
                  />
                  <div className="w-full">
                    <PostSummary post={post} />
                    <div
                      className={cn(
                        "mt-2 rounded-2xl flex flex-row px-6 py-2 items-center justify-between border",
                        post.latestAnalysisStatus === "COMPLETED"
                          ? "bg-selected/50 "
                          : "bg-muted",
                      )}
                    >
                      <div className="text-sm font-medium">
                        Analyse du {formatAnalysisDate(post.latestAnalysisDate)}
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={post.latestAnalysisStatus !== "COMPLETED"}
                          onClick={() => {
                            void deletePost(post);
                          }}
                        >
                          <Trash2Icon /> Supprimer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={post.latestAnalysisStatus !== "COMPLETED"}
                          onClick={() => {
                            void openPostAndStartScraping(post.url);
                          }}
                        >
                          <RotateCwIcon /> Relancer l&apos;analyse
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={post.latestAnalysisStatus !== "COMPLETED"}
                          render={
                            <Link
                              to={
                                "/posts/" +
                                post.socialNetwork +
                                "/" +
                                post.postId
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
            </label>
          ))}
      </div>
    </main>
  );
}

export default PostListPage;
