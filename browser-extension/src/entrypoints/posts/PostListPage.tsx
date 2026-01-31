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
      <h1>BTH app - Report Page</h1>

      <h2>Posts</h2>
      {!posts && <div>Loading...</div>}
      {posts && (
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={post.url || index}>
                <TableCell> {post.scrapedAt}</TableCell>
                <TableCell> {post.socialNetwork}</TableCell>
                <TableCell> {post.author.name}</TableCell>
                <TableCell> {post.publishedAt}</TableCell>
                <TableCell> {post.title}</TableCell>
                <TableCell> {ellipsis(post.textContent || "")}</TableCell>

                <TableCell> {post.comments.length}</TableCell>
                <TableCell>
                  <a href={post.url}>{post.postId}</a>
                </TableCell>
                <TableCell>
                  <Link to={"/" + post.postId + "/" + post.scrapedAt}>
                    View
                  </Link>
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
