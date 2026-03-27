import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import { ReportQueryData, useStepper, getFormId } from "./BuildReport";
import { useQuery } from "@tanstack/react-query";
import CommentsTable, { PostCommentWithId } from "../Posts/CommentsTable";
import { isCommentHateful } from "@/shared/utils/post-util";
import { Spinner } from "@/components/ui/spinner";

function Step3Comments({
  reportQueryData,
  setCommentList,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setCommentList: (commentIdList: PostCommentWithId[]) => void;
}>) {
  const queryKey = ["posts", reportQueryData?.socialNetworkList];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPostsByPostIdList(reportQueryData?.postIdList ?? []),
  });

  // On définit arbitrairement un id pour être en mesure de sélectionner les commentaires
  const allComments: PostCommentWithId[] = (data || [])
    .flatMap((p) => p.comments)
    .filter((c) => isCommentHateful(c))
    .map((comment, i) => {
      return { ...comment, id: i.toString() };
    });

  const stepper = useStepper();

  const handleSubmit = (commentIdList: string[]) => {
    setCommentList(
      allComments.filter((comment) => commentIdList.includes(comment.id)),
    );
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
          commentList={allComments}
          selectedCommentIdList={reportQueryData?.postCommentList.map(comment => comment.id) ?? []}
          onSubmit={handleSubmit}
          formId={getFormId(stepper.state.current.data.id)}
        />
      )}
    </div>
  );
}

export default Step3Comments;
