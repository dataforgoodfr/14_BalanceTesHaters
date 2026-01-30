import { HashRouter, Route, Routes } from "react-router";
import PostListPage from "./PostListPage";
import PostDetailPage from "./PostDetailPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route index path="/" element={<PostListPage />} />
        <Route path="/:postId/:scrapedAt" element={<PostDetailPage />} />
      </Routes>
    </HashRouter>
  );
}
