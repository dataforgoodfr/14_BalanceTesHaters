import { HashRouter, Route, Routes } from "react-router";
import PostSnapshotListPage from "./Developer/PostSnapshotListPage";
import PostSnapshotDetailPage from "./Developer/PostSnapshotDetailPage";
import { DebugPage } from "./DebugPage";
import HomePage from "./Home/HomePage";
import SidePanelMenu from "./SidePanelMenu";
import PostListPage from "./Posts/PostListPage";
import PostDetailPage from "./Posts/PostDetailPage";
import { BuildReport } from "./Report/BuildReport";

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-1  bg-gray-100 dark:bg-gray-800">
        <SidePanelMenu />
        <Routes>
          <Route index path="/" element={<HomePage />} />
          <Route index path="/posts" element={<PostListPage />} />
          <Route
            index
            path="/posts/:socialNetworkName/:postId"
            element={<PostDetailPage />}
          />
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
          <Route path="/build-report" element={<BuildReport />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
