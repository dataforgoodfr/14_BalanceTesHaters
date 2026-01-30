import { HashRouter, Route, Routes } from "react-router";
import PostListPage from "./PostListPage";
import PostDetailPage from "./PostDetailPage";
import { useInitializeTheme } from "@/styles/useInitializeTheme";

export default function App() {
  useInitializeTheme();
  return (
    <HashRouter>
      <Routes>
        <Route index path="/" element={<PostListPage />} />
        <Route path="/:postId/:scrapedAt" element={<PostDetailPage />} />
      </Routes>
    </HashRouter>
  );
}
