import { HashRouter, Route, Routes } from "react-router";
import PostSnapshotListPage from "./Developer/PostSnapshotListPage";
import PostSnapshotDetailPage from "./Developer/PostSnapshotDetailPage";
import { useInitializeTheme } from "@/styles/useInitializeTheme";
import "./App.css";
import { DebugPage } from "./DebugPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
import HomePage from "./Home/HomePage";
import SidePanelMenu from "./SidePanelMenu";
import PostListPage from "./PostList/PostListPage";

export default function App() {
  useInitializeTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="flex h-screen">
          <SidePanelMenu />
          <Routes>
            <Route index path="/" element={<HomePage />} />
            <Route index path="/posts" element={<PostListPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route
              index
              path="/post-snapshots"
              element={<PostSnapshotListPage />}
            />
            <Route
              path="/post-snapshots/:snapshotId"
              element={<PostSnapshotDetailPage />}
            />
          </Routes>
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}
