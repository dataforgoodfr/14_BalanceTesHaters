import { getPostByIdAndScrapedAt } from "@/entrypoints/shared/storage/posts-storage";
import { Post } from "@/entrypoints/shared/model/post";
import { useParams } from "react-router";

function PostDetailPage() {
  const { postId, scrapedAt } = useParams();
  const [post, setPost] = useState<Post | undefined>(undefined);
  useEffect(() => {
    if (postId && scrapedAt) {
      getPostByIdAndScrapedAt(postId, scrapedAt).then((post) => {
        setPost(post);
      });
    }
  }, [postId, scrapedAt]);

  return (
    <>
      <h1>BTH app - Report Page</h1>

      <h2>Posts</h2>
      {!post && <div>Loading...</div>}
      {post && (
        <>
          <div>
            <div>
              <a href={post.author.accountHref}>{post.author.name}</a>
            </div>
            <div>{post.postId}</div>
            <div>{post.publishedAt}</div>
            <div>{post.scrapedAt}</div>
            <div>{post.socialNetwork}</div>
            <div>{post.textContent}</div>
            <div>{post.title}</div>
            <div>
              <a href={post.url}>{post.url}</a>
            </div>
          </div>
          <h2>Commentaires</h2>
          <table>
            <thead>
              <tr>
                <th>Date scraping</th>
                <th>Auteur</th>
                <th>Date publication</th>
                <th>Aperçu contenu/description</th>

                <th>Nb likes</th>
                <th>Nb replies</th>
                <th>Id</th>
                <th>Screenshot</th>
              </tr>
            </thead>
            <tbody>
              {post.comments.map((comment, index) => (
                <tr key={index}>
                  <td> {comment.scrapedAt}</td>

                  <td> {comment.author.name}</td>
                  <td> {comment.publishedAt}</td>
                  <td> {ellipsis(comment.textContent || "")}</td>

                  <td> {comment.nbLikes}</td>
                  <td> {comment.replies.length}</td>

                  <td>
                    <img
                      src={"data:image/png;base64," + comment.screenshotData}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default PostDetailPage;
