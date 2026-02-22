import { Link } from "react-router";
import {
  getPostSnapshots as getPostsFromStorage,
  deleteAllPostSnapshots,
} from "../../shared/storage/post-snapshot-storage";
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
import { RefreshCwIcon, TrashIcon } from "lucide-react";

function PostListPage() {
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

  return (
    <div className="p-4">
      <h1>Publications collectées</h1>

      {postsQuery.isLoading && <Spinner className="size-8" />}
      {postsQuery.data && (
        <>
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
            onClick={() => {
              deleteAllMutation.mutate();
            }}
          >
            {deleteAllMutation.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Tout supprimer
          </Button>
          <Table className="text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Collecte</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Réseau social</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead>Aperçu contenu/description</TableHead>
                <TableHead>Nb commentaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postsQuery.data.map((post, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <Tooltip>
                        <TooltipTrigger>
                          {new Date(post.scrapedAt).toLocaleDateString()}
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(post.scrapedAt).toLocaleDateString()}{" "}
                          {new Date(post.scrapedAt).toTimeString()}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size={"xs"}
                        render={
                          <Link to={"/posts/" + post.id}>D&eacute;tails</Link>
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {post.classificationStatus ? (
                      <>
                        {post.classificationStatus} ({post.classificationJobId})
                      </>
                    ) : (
                      <>Non démarrée</>
                    )}
                  </TableCell>
                  <TableCell> {post.socialNetwork}</TableCell>
                  <TableCell> {post.author.name}</TableCell>
                  <TableCell>
                    <a href={post.url} target="_blank" rel="noreferrer">
                      <p>{post.title}</p>

                      <div className="text-muted-foreground">
                        Publiée le{" "}
                        <DisplayPublicationDate date={post.publishedAt} />
                      </div>
                    </a>
                  </TableCell>
                  <TableCell> {ellipsis(post.textContent || "")}</TableCell>

                  <TableCell> {post.comments.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

function ellipsis(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 1) + "…";
}

export default PostListPage;
