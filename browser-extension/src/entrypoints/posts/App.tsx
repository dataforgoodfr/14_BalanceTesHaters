import { HashRouter, Route, Routes } from "react-router";
import PostListPage from "./Developer/RawPostListPage";
import PostDetailPage from "./Developer/RawPostDetailPage";
import { useInitializeTheme } from "@/styles/useInitializeTheme";
import "./App.css";
import { DebugPage } from "./DebugPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
import HomePage from "./Home/HomePage";
import SidePanelMenu from "./SidePanelMenu";

export default function App() {
  useInitializeTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="flex h-screen">
          <SidePanelMenu />
          <Routes>
            <Route index path="/" element={<HomePage />} />
            <Route index path="/raw-posts" element={<PostListPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/raw-posts/:snapshotId" element={<PostDetailPage />} />
          </Routes>
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}
