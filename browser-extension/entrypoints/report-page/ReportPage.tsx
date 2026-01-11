import { Post } from "../shared/model/post";
import { getPosts as getPostsFromStorage } from "../shared/storage/posts-storage";
import "./ReportPage.css";

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
              <th>Titre</th>
              <th>Aperçu contenu/description</th>

              <th>Nb commentaires</th>
              <th>Id</th>
              <th>Télécharger</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, index) => (
              <tr key={post.url || index}>
                <td> {post.scrapedAt}</td>
                <td> {post.socialNetwork}</td>
                <td> {post.author.name}</td>
                <td> {post.publishedAt}</td>
                <td> {post.title}</td>
                <td> {ellipsis(post.textContent || "")}</td>

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

function ellipsis(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 1) + "…";
}

export default ReportPageApp;
