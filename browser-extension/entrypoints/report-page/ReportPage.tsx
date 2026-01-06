import { Post } from "../shared/model/post";
import { getPosts as getPostsFromStorage } from "../shared/storage/posts-storage";
import "./ReportPage.css";

function downloadPost(post: Post) {
  console.log("Downloading first comment");
  if (post.comments.length > 0) {
    const screenshotDataUrl: string = post.comments[0].screenshotDataUrl;
    browser.downloads.download({
      url: screenshotDataUrl, // The object URL can be used as download URL
      filename: "screenshot.png",
      //...
    });
  }
}

function ReportPageApp() {
  const [posts, setPosts] = useState<Post[] | undefined>(undefined);
  useEffect(() => {
    getPostsFromStorage().then((posts) => {
      console.log("Posts", posts);
      setPosts(posts);
    });
  }, []);
  return (
    <>
      <h1>BTH app - Report Page</h1>

      <h2>Posts</h2>
      {!posts && <div>Loading...</div>}
      {posts && (
        <table>
          <thead>
            <tr>
              <th>Date scraping</th>

              <th>Réseau social</th>
              <th>Auteur</th>
              <th>Date publication</th>

              <th>Nb commentaires</th>
              <th>Id</th>
              <th>Télécharger</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr>
                <td> {post.scrapTimestamp}</td>
                <td> {post.socialNetwork}</td>

                <td> {post.author.name}</td>
                <td> {post.publishedAt}</td>
                <td> {post.comments.length}</td>
                <td>
                  <a href={post.url}>{post.postId}</a>
                </td>
                <td>
                  <button onClick={() => downloadPost(post)}>
                    Télécharger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default ReportPageApp;
