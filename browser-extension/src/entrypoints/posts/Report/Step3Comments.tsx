import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import { ReportQueryData, useStepper, getFormId } from "./BuildReport";
import { useQuery } from "@tanstack/react-query";
import CommentsTable from "../Posts/CommentsTable";
import { isCommentHateful } from "@/shared/utils/post-util";
import { Spinner } from "@/components/ui/spinner";
import React from "react";

function Step3Comments({
  reportQueryData,
  setCommentIdList,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setCommentIdList: (commentIdList: string[]) => void;
}>) {
  const queryKey = ["posts", reportQueryData?.socialNetworkList];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPostsByPostIdList(reportQueryData?.postIdList ?? []),
  });

  const allComments = (data || [])
    .flatMap((p) => p.comments)
    .filter((c) => isCommentHateful(c));
  const stepper = useStepper();

  const handleSubmit = (commentIdList: string[]) => {
    setCommentIdList(commentIdList);
    stepper.navigation.next();
  };

  return (
    <div className="flex flex-col gap-4 h-9/12 justify-center">
      <span className="text-xl font-bold">
        Affinez la sélection de commentaires à exporter :
      </span>
      {isLoading && <Spinner className="size-8" />}
      {!isLoading && (!allComments || allComments.length === 0) && (
        <p className="text-center">Aucun commentaire</p>
      )}
      {!isLoading && allComments.length > 0 && (
        <CommentsTable
          comments={allComments}
          defaultCommentIdList={reportQueryData?.commentIdList ?? []}
          onSubmit={handleSubmit}
          formId={getFormId(stepper.state.current.data.id)}
        />
      )}
    </div>
  );
}

export default Step3Comments;
