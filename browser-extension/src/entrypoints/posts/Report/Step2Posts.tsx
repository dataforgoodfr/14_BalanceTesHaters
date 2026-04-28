import SearchSortFiltersPostList from "../Shared/SearchSortFiltersPostList";
import { ReportQueryData, useStepper } from "./BuildReport";

import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import PostSummary from "../Shared/PostSummary";
import { useForm } from "@tanstack/react-form";
import { getFormId } from "./StepperComponents";
import { formatAnalysisDate } from "@/shared/utils/post-util";
import { useFilteredPostList } from "../Shared/useFilteredPostList";

function Step2Posts({
  reportQueryData,
  setPostList,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setPostList: (postList: string[]) => void;
}>) {
  const {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    isLoading,
    filteredPosts,
  } = useFilteredPostList(reportQueryData?.socialNetworkList || []);

  const stepper = useStepper();

  const form = useForm({
    defaultValues: {
      postList: reportQueryData?.postIdList ?? [],
    },
    onSubmit: () => {
      setPostList(form.state.values.postList);
      void stepper.navigation.next();
    },
  });

  return (
    <div className="flex flex-col gap-4 h-9/12 ">
      <span className="text-xl font-bold">
        Choisissez une ou plusieurs analyses de publications à inclure dans le
        rapport :
      </span>
      <SearchSortFiltersPostList
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        postFilters={postFilters}
        setPostFilters={setPostFilters}
      />

      {isLoading && <Spinner className="size-8" />}
      {!isLoading && (!filteredPosts || filteredPosts.length === 0) && (
        <p className="text-center">Aucune publication</p>
      )}

      <form
        id={getFormId(stepper.state.current.data.id)}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-6 p-4 flex justify-center"
      >
        <form.Field
          name="postList"
          validators={{
            onChange: ({ value }) =>
              value.length < 1
                ? "Sélectionner au moins une publication"
                : undefined,
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-4">
              <div>
                {field.state.meta.errors.length > 0 && (
                  <span className="text-destructive text-sm mt-2">
                    {field.state.meta.errors.join(", ")}
                  </span>
                )}
              </div>
              {filteredPosts &&
                filteredPosts.length > 0 &&
                filteredPosts.map((post) => (
                  <Card key={post.postId}>
                    <CardContent className="flex items-center gap-5">
                      <Checkbox
                        id={post.postId}
                        checked={field.state.value.includes(post.postId)}
                        onCheckedChange={(checked) => {
                          const currentValue = field.state.value;
                          const nextValue = checked
                            ? [...currentValue, post.postId]
                            : currentValue.filter((val) => val !== post.postId);

                          field.handleChange(nextValue);
                        }}
                      />
                      <div className="w-full">
                        <PostSummary
                          url={post.url}
                          publishedAt={post.publishedAt}
                          title={post.title}
                          coverImageUrl={post.coverImageUrl}
                        />
                        <Card className="bg-muted mt-2 flex flex-row px-5 py-3 items-center justify-between">
                          <div className="font-semibold">
                            Analyse du{" "}
                            {formatAnalysisDate(post.lastAnalysisDate)}
                          </div>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </form.Field>
      </form>
    </div>
  );
}

export default Step2Posts;
