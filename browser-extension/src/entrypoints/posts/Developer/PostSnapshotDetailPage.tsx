import { getPostSnapshotById } from "@/shared/storage/post-snapshot-storage";
import { Link, useParams } from "react-router";
import { CommentTreeTable } from "./CommentTreeTable";
import { Binary, Check, MoveLeft, RefreshCcwIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DisplayPublicationDate from "./DisplayPublicationDate";
import { sendSubmitClassificationRequestMessage } from "../../background/classification/submitClassificationForPostMessage";
import { sendUpdatePostWithClassificationResultMessage } from "../../background/classification/updatePostWithClassificationResultMessage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { isRunningClassificationStatus } from "@/shared/model/ClassificationStatus";
import { getPublicationTypeLabel } from "@/shared/utils/post-util";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

type ClassificationAction = "start-or-refresh" | "resubmit";

function PostSnapshotDetailPage() {
  const params = useParams();
  const snapshotId = params.snapshotId || "";
  const queryClient = useQueryClient();
  const [resubmitConfirmationOpen, setResubmitConfirmationOpen] =
    useState(false);

  const queryKey = ["postSnapshots", snapshotId];
  const { data: post, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getPostSnapshotById(snapshotId),
  });

  const startOrRefreshStatusMutation = useMutation({
    mutationFn: async (action: ClassificationAction) => {
      if (!post) {
        return;
      }

      if (action === "resubmit") {
        const result = await sendSubmitClassificationRequestMessage(
          post.id,
          true,
        );
        if (!result.success) {
          throw new Error("Classification resubmission failed.");
        }
        return;
      }

      if (!post.classificationJobId) {
        const result = await sendSubmitClassificationRequestMessage(post.id);
        if (!result.success) {
          throw new Error("Classification submission failed.");
        }
      } else if (
        !post.classificationStatus ||
        isRunningClassificationStatus(post.classificationStatus)
      ) {
        const result = await sendUpdatePostWithClassificationResultMessage(
          post.id,
        );
        if (!result.success) {
          throw new Error("Classification refresh failed.");
        }
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      return queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <main>
      {isLoading && <div>Loading...</div>}
      {post && (
        <>
          <h1 className="text-left pt-2 mb-4">
            Publication {post.socialNetwork} - {post.postId} de{" "}
            <a
              href={post.author.accountHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.author.name}
            </a>
            {" · "}
            {getPublicationTypeLabel(post.url, post.socialNetwork)}
          </h1>
          <div className="text-left">
            <Button
              variant="link"
              render={
                <Link to="/post-snapshots">
                  <MoveLeft /> Retour à la liste des publications
                </Link>
              }
            />
          </div>

          <h2 className="text-left pt-2 mb-4">Details</h2>
          <div className="rounded-md border text-left p-4 grid grid-cols-2">
            <div>
              <div className="text-lg">
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  {" "}
                  {post.title}
                </a>
              </div>
              Publiée le: <DisplayPublicationDate date={post.publishedAt} />
              <div>
                Capturée le: {new Date(post.scrapedAt).toLocaleDateString()}
              </div>
              <div>
                Type: {getPublicationTypeLabel(post.url, post.socialNetwork)}
              </div>
              <div className="break-all">
                URL:{" "}
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  {post.url}
                </a>
              </div>
            </div>
            <div className="italic">
              <p className="whitespace-pre-wrap">{post.textContent}</p>
            </div>
          </div>

          <h2 className="text-left pt-2 mb-4">État classification</h2>
          <div className="text-left flex flex-row items-center gap-2  ">
            {post.classificationStatus === "COMPLETED" && (
              <Check className="text-green-500" />
            )}
            {post.classificationStatus &&
              isRunningClassificationStatus(post.classificationStatus) && (
                <Binary className="text-orange-500" />
              )}
            {(!post.classificationStatus ||
              post.classificationStatus === "FAILED" ||
              post.classificationStatus === "JOB_NOT_FOUND") && (
              <X className="text-red-500" />
            )}
            <span className="font-medium">
              {post.classificationStatus && post.classificationStatus}
              {!post.classificationStatus && "Non démarrée"}
            </span>
            {(!post.classificationJobId ||
              !post.classificationStatus ||
              isRunningClassificationStatus(post.classificationStatus)) && (
              <Button
                size="sm"
                className="ml-3"
                disabled={startOrRefreshStatusMutation.isPending}
                onClick={() =>
                  startOrRefreshStatusMutation.mutate("start-or-refresh")
                }
              >
                {startOrRefreshStatusMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCcwIcon data-icon="inline-start" />
                )}
                Mettre à jour
              </Button>
            )}
            {post.classificationJobId && (
              <Button
                size="sm"
                variant="outline"
                className="ml-3"
                disabled={startOrRefreshStatusMutation.isPending}
                onClick={() => {
                  startOrRefreshStatusMutation.reset();
                  setResubmitConfirmationOpen(true);
                }}
              >
                <RefreshCcwIcon data-icon="inline-start" />
                Soumettre à nouveau
              </Button>
            )}
          </div>

          <Dialog
            open={resubmitConfirmationOpen}
            onOpenChange={(open) => {
              setResubmitConfirmationOpen(open);
              if (!open) {
                startOrRefreshStatusMutation.reset();
              }
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Soumettre à nouveau ?</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground mt-0!">
                Une nouvelle classification remplacera la classification
                actuelle.
              </p>
              {startOrRefreshStatusMutation.isError && (
                <p role="alert" className="text-destructive text-sm">
                  La nouvelle soumission a échoué.
                </p>
              )}
              <DialogFooter className="mt-4 justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={startOrRefreshStatusMutation.isPending}
                  onClick={() => setResubmitConfirmationOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  disabled={startOrRefreshStatusMutation.isPending}
                  onClick={() =>
                    startOrRefreshStatusMutation.mutate("resubmit", {
                      onSuccess: () => setResubmitConfirmationOpen(false),
                    })
                  }
                >
                  {startOrRefreshStatusMutation.isPending && (
                    <Spinner data-icon="inline-start" />
                  )}
                  Soumettre à nouveau
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <h2 className="text-left pt-2 my-4">Commentaires</h2>

          <CommentTreeTable postSnapshotId={post.id} comments={post.comments} />
        </>
      )}
    </main>
  );
}

export default PostSnapshotDetailPage;
