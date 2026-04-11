import { Link } from "react-router";
import {
  getPostSnapshots as getPostsFromStorage,
  deleteAllPostSnapshots,
  deletePostSnapshot,
} from "../../../shared/storage/post-snapshot-storage";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DisplayPublicationDate from "./DisplayPublicationDate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  InstagramIcon,
  RefreshCwIcon,
  TrashIcon,
  YoutubeIcon,
} from "lucide-react";
import { countAllComments } from "@/shared/model/PostSnapshot";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { getSocialNetworkName } from "@/shared/utils/post-util";

function PostSnapshotListPage() {
  const queryClient = useQueryClient();
  const queryKey = ["posts"];

  const postsQuery = useQuery({
    queryKey: queryKey,
    queryFn: getPostsFromStorage,
  });

  const refreshMutation = useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      // Invalidate and refetch
      return queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllPostSnapshots,
    onSuccess: () => {
      // Invalidate and refetch
      return queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: deletePostSnapshot,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  const confirmAndDeletePostSnapshot = (postId: string, postTitle?: string) => {
    const targetLabel =
      postTitle && postTitle.trim().length > 0
        ? `"${ellipsis(postTitle, 80)}"`
        : "cet élément";
    const confirmed = window.confirm(
      `Confirmer la suppression définitive de ${targetLabel} ?`,
    );
    if (!confirmed) {
      return;
    }
    deleteOneMutation.mutate(postId);
  };

  const confirmAndDeleteAllPostSnapshots = () => {
    const confirmed = window.confirm(
      "Confirmer la suppression définitive de toutes les publications collectées ?",
    );
    if (!confirmed) {
      return;
    }
    deleteAllMutation.mutate();
  };

  return (
    <div className="p-4 flex flex-col gap-4 w-full max-w-full overflow-x-hidden">
      <h1>Publications collectées</h1>

      {postsQuery.isLoading && <Spinner className="size-8" />}
      {postsQuery.data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshMutation.mutate();
              }}
            >
              {refreshMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Recharger
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={
                postsQuery.data.length == 0 || deleteAllMutation.isPending
              }
              onClick={confirmAndDeleteAllPostSnapshots}
            >
              {deleteAllMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <TrashIcon data-icon="inline-start" />
              )}
              Tout supprimer
            </Button>
          </div>

          <div className="[&>[data-slot=table-container]]:overflow-x-hidden">
            <Table className="w-full max-w-full text-left table-fixed [&_th]:align-top [&_td]:align-top">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[11%] whitespace-normal">
                    Collecte
                  </TableHead>
                  <TableHead className="w-[19%] whitespace-normal">
                    Classification
                  </TableHead>
                  <TableHead className="w-[11%] whitespace-normal">
                    Réseau social
                  </TableHead>
                  <TableHead className="w-[12%] whitespace-normal">
                    Auteur
                  </TableHead>
                  <TableHead className="w-[22%] whitespace-normal">
                    Publication
                  </TableHead>
                  <TableHead className="w-[15%] whitespace-normal">
                    Aperçu contenu/description
                  </TableHead>
                  <TableHead className="w-[10%] whitespace-normal text-right">
                    Nb commentaires (racines/tous)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postsQuery.data.map((post, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-normal">
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger>
                            {new Date(post.scrapedAt).toLocaleDateString()}
                          </TooltipTrigger>
                          <TooltipContent>
                            {new Date(post.scrapedAt).toLocaleString()}
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size={"xs"}
                            render={
                              <Link to={"/post-snapshots/" + post.id}>
                                D&eacute;tails
                              </Link>
                            }
                          />
                          <Button
                            variant="outline"
                            size={"xs"}
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            disabled={deleteOneMutation.isPending}
                            onClick={() =>
                              confirmAndDeletePostSnapshot(post.id, post.title)
                            }
                          >
                            <TrashIcon
                              data-icon="inline-start"
                              className="size-3.5"
                            />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal break-all">
                      {post.classificationStatus ? (
                        <>
                          {post.classificationStatus} ({post.classificationJobId})
                        </>
                      ) : (
                        <>Non démarrée</>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="inline-flex items-center gap-2">
                        {post.socialNetwork === SocialNetwork.YouTube ? (
                          <YoutubeIcon className="size-4 text-red-600" />
                        ) : (
                          <InstagramIcon className="size-4 text-pink-600" />
                        )}
                        <span>{getSocialNetworkName(post.socialNetwork)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal break-all">
                      {post.author.name}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="space-y-1">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline break-all"
                        >
                          {post.title || post.url}
                        </a>
                        <div className="text-muted-foreground text-xs">
                          Publiée le{" "}
                          <DisplayPublicationDate date={post.publishedAt} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal break-all">
                      {post.textContent ? ellipsis(post.textContent, 140) : "—"}
                    </TableCell>

                    <TableCell className="whitespace-normal text-right tabular-nums">
                      {post.comments.length}/{countAllComments(post.comments)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function ellipsis(str: string, maxLength: number = 50): string {
  const normalized = str.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.substring(0, maxLength - 1) + "…";
}

export default PostSnapshotListPage;
