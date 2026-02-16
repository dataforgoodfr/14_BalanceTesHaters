import { Link } from "react-router";
import { Post } from "../../shared/model/post";
import {
  getPosts as getPostsFromStorage,
  deleteAllPosts,
} from "../../shared/storage/posts-storage";
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

function PostListPage() {
  const [posts, setPosts] = useState<Post[] | undefined>(undefined);
  useEffect(() => {
    getPostsFromStorage().then((posts) => {
      console.log("Posts", posts);
      setPosts(posts.filter((p) => p != undefined));
    });
  }, []);

  function handleDeleteAllPosts() {
    deleteAllPosts().then(() => {
      // TODO replace with propoer data refresh
      globalThis.location.reload();
    });
  }

  return (
    <>
      <h1>Publications collectées</h1>

      {!posts && <Spinner className="size-8" />}
      {posts && (
        <>
          <Button
            variant="destructive"
            size="sm"
            disabled={posts.length == 0}
            onClick={handleDeleteAllPosts}
          >
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
              {posts.map((post, index) => (
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
                          <Link to={"/" + post.postId + "/" + post.scrapedAt}>
                            D&eacute;tails
                          </Link>
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
    </>
  );
}

function ellipsis(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 1) + "…";
}

export default PostListPage;
