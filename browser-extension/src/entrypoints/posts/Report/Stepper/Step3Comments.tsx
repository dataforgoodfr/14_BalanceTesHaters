import type { ReportQueryData } from "./BuildReport";
import { useStepper } from "./BuildReport";
import CommentsTable from "../../Posts/CommentsTable";
import type { PostCommentWithId } from "@/shared/utils/post-util";
import { CommentSortingCategory } from "@/shared/utils/post-util";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
import { getFormId } from "./StepperComponents";
import { StepHeader } from "./StepHeader";
import { useFilteredCommentList } from "../../Shared/useFilteredCommentList";

function Step3Comments({
  reportQueryData,
  setCommentList,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setCommentList: (commentIdList: PostCommentWithId[]) => void;
}>) {
  const [commentSortingCategory, setCommentSortingCategory] =
    React.useState<CommentSortingCategory>(CommentSortingCategory.SCORE_ASC);

  const {
    commentFilters,
    setCommentFilters,
    filteredCommentList: commentList,
    hatefulAuthorList,
    isLoading,
  } = useFilteredCommentList(
    reportQueryData?.postIdList ?? [],
    commentSortingCategory,
  );

  const hatefulCommentList = commentList.filter((c) => c.isCommentHateful);

  const stepper = useStepper();

  const handleSubmit = (commentIdList: string[]) => {
    setCommentList(
      hatefulCommentList.filter((comment) =>
        commentIdList.includes(comment.id),
      ),
    );
    void stepper.next();
  };

  return (
    <>
      <StepHeader
        title="Sélectionne les commentaires"
        subTitle="Choisis les commentaires malveillants à inclure dans le rapport."
      />
      <div className="flex flex-col gap-4 h-9/12 justify-center">
        {isLoading && <Spinner className="size-8" />}
        {!isLoading &&
          (!hatefulCommentList || hatefulCommentList.length === 0) && (
            <p className="text-center">Aucun commentaire</p>
          )}
        {!isLoading && hatefulCommentList.length > 0 && (
          <CommentsTable
            commentList={hatefulCommentList}
            commentFilters={commentFilters}
            setCommentFilters={setCommentFilters}
            commentSortingCategory={commentSortingCategory}
            setCommentSortingCategory={setCommentSortingCategory}
            defaultSelectedCommentIdList={
              reportQueryData?.postCommentList.map((comment) => comment.id) ??
              []
            }
            onSubmit={handleSubmit}
            formId={getFormId(stepper.current.id)}
            authorList={hatefulAuthorList}
            showScreenshotColumn={true}
            showCreateReportButton={false}
          />
        )}
      </div>
    </>
  );
}

export default Step3Comments;
