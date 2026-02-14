import { HashRouter, Route, Routes } from "react-router";
import PostListPage from "./PostListPage";
import PostDetailPage from "./PostDetailPage";
import { useInitializeTheme } from "@/styles/useInitializeTheme";
import "./App.css";
import { DebugPage } from "./DebugPage";

export default function App() {
  useInitializeTheme();
  return (
    <HashRouter>
      <Routes>
        <Route index path="/" element={<PostListPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/:postId/:scrapedAt" element={<PostDetailPage />} />
      </Routes>
    </HashRouter>
  );
}
