import { HashRouter, Route, Routes } from "react-router";
import PostSnapshotListPage from "./Developer/PostSnapshotListPage";
import PostSnapshotDetailPage from "./Developer/PostSnapshotDetailPage";
import { DebugPage } from "./DebugPage";
import HomePage from "./Home/HomePage";
import SidePanelMenu from "./SidePanelMenu";
import PostListPage from "./Posts/PostListPage";
import PostDetailPage from "./Posts/PostDetailPage";

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen">
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
        </Routes>
      </div>
    </HashRouter>
  );
}
