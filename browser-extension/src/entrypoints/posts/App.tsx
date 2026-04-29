import { HashRouter, Route, Routes } from "react-router";
import PostSnapshotListPage from "./Developer/PostSnapshotListPage";
import PostSnapshotDetailPage from "./Developer/PostSnapshotDetailPage";
import { DebugPage } from "./DebugPage";
import HomePage from "./Home/HomePage";
import SidePanelMenu from "./SidePanelMenu";
import PostListPage from "./Posts/PostListPage";
import PostDetailPage from "./Posts/PostDetailPage";
import { BuildReport } from "./Report/BuildReport";
import HelpPage from "./Help/HelpPage";
import ContactSupport from "./ContactSupport/ContactSupport";

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
        <div className="w-1/5 overflow-y-auto">
          <SidePanelMenu />
        </div>
        <div className="flex-1 w-fit overflow-y-auto ">
          <Routes>
            <Route index path="/" element={<HomePage />} />
            <Route index path="/posts" element={<PostListPage />} />
            <Route
              index
              path="/posts/:socialNetworkName/:postId"
              element={<PostDetailPage />}
            />
            <Route index path="/help" element={<HelpPage />} />

            <Route
              index
              path="/post-snapshots"
              element={<PostSnapshotListPage />}
            />

            <Route path="/build-report" element={<BuildReport />} />

            <Route path="/contact-support" element={<ContactSupport />} />

            {/* Dev pages */}
            <Route
              path="/post-snapshots/:snapshotId"
              element={<PostSnapshotDetailPage />}
            />
            <Route path="/debug" element={<DebugPage />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}
