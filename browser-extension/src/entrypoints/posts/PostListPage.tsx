import { Link } from "react-router";
import { Post } from "../../shared/model/post";
import { getPosts as getPostsFromStorage } from "../../shared/storage/posts-storage";
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
import { Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function downloadPost(post: Post) {
  console.log("Downloading first comment");
  if (post.comments.length > 0) {
    const screenshotData: string = post.comments[0].screenshotData;

    const screenshotAsUrl = "data:image/png;base64," + screenshotData;
    browser.downloads.download({
      url: screenshotAsUrl,
      filename: "screenshot.png",
    });
  }
}

function PostListPage() {
  const [posts, setPosts] = useState<Post[] | undefined>(undefined);
  useEffect(() => {
    getPostsFromStorage().then((posts) => {
      console.log("Posts", posts);
      setPosts(posts.filter((p) => p != undefined));
    });
  }, []);
  return (
    <>
      <h1>Publications collectées</h1>
      {!posts && <Spinner className="size-8" />}
      {posts && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Traitement</TableHead>
              <TableHead>Date scraping</TableHead>
              <TableHead>Réseau social</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Date publication</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Aperçu contenu/description</TableHead>

              <TableHead>Nb commentaires</TableHead>
              <TableHead>Id</TableHead>
              <TableHead>View details</TableHead>
              <TableHead>Télécharger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      {post.backendId && <Check className="text-green-500" />}
                      {!post.backendId && <X className="text-red-500" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      {post.backendId && "Traitement effectué avec succès"}
                      {!post.backendId && "Echec du traitement"}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell> {post.scrapedAt}</TableCell>
                <TableCell> {post.socialNetwork}</TableCell>
                <TableCell> {post.author.name}</TableCell>
                <TableCell> {post.publishedAt}</TableCell>
                <TableCell> {post.title}</TableCell>
                <TableCell> {ellipsis(post.textContent || "")}</TableCell>

                <TableCell> {post.comments.length}</TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    render={<a href={post.url}>{post.postId}</a>}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    render={
                      <Link to={"/" + post.postId + "/" + post.scrapedAt}>
                        View
                      </Link>
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={() => downloadPost(post)}>
                    Télécharger
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
