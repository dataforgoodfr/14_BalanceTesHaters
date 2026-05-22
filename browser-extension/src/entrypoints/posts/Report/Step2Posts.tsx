import SearchSortFiltersPostList from "../Shared/SearchSortFiltersPostList";
import { ReportQueryData, useStepper } from "./BuildReport";

import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import PostSummary from "../Shared/PostSummary";
import { useForm } from "@tanstack/react-form";
import { getFormId } from "./StepperComponents";
import {
  formatAnalysisDate,
  PostSortingCategory,
} from "@/shared/utils/post-util";
import { useFilteredPostList } from "../Shared/useFilteredPostList";
import React from "react";
import { StepHeader } from "./StepHeader";

function Step2Posts({
  reportQueryData,
  setPostList,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setPostList: (postList: string[]) => void;
}>) {
  const [postSortingCategory, setPostSortingCategory] =
    React.useState<PostSortingCategory>(PostSortingCategory.ANALYSIS_DATE_DESC);

  const {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    isLoading,
    filteredPosts,
  } = useFilteredPostList(
    reportQueryData?.socialNetworkList || [],
    postSortingCategory,
  );

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
    <div className="flex flex-col gap-4 h-9/12 items-center">
      <StepHeader
        title="Sélectionne les publications"
        subTitle="Choisis une ou plusieurs publications à inclure dans le rapport."
      />

      <div>
        <SearchSortFiltersPostList
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          postFilters={postFilters}
          setPostFilters={setPostFilters}
          postSortingCategory={postSortingCategory}
          setPostSortingCategory={setPostSortingCategory}
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
          className="space-y-6 flex justify-center"
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
                              : currentValue.filter(
                                  (val) => val !== post.postId,
                                );

                            field.handleChange(nextValue);
                          }}
                        />
                        <div className="w-full">
                          <PostSummary post={post} />
                          <Card className="bg-muted mt-2 flex flex-row px-5 py-3 items-center justify-between">
                            <div className="font-semibold">
                              Analyse du{" "}
                              {formatAnalysisDate(post.latestAnalysisDate)}
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
    </div>
  );
}

export default Step2Posts;
