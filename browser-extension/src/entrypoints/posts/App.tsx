import { HashRouter, Route, Routes } from "react-router";
import PostSnapshotListPage from "./Developer/PostSnapshotListPage";
import PostSnapshotDetailPage from "./Developer/PostSnapshotDetailPage";
import { DebugPage } from "./DebugPage";
import HomePage from "./Home/HomePage";
import PostListPage from "./Posts/PostListPage";
import PostDetailPage from "./Posts/PostDetailPage";
import { BuildReport } from "./Report/BuildReport";
import HelpPage from "./Help/HelpPage";
import ProductHelpPage from "./Help/ProductHelpPage";
import HarrasementHelpPage from "./Help/HarrasementHelpPage";
import PrivacyPolicyPage from "./Help/PrivacyPolicyPage";
import ContactSupport from "./ContactSupport/ContactSupport";
import LayoutWithSidePanel from "./LayoutWithSidePanel";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          index
          path="/"
          element={<LayoutWithSidePanel page={<HomePage />} />}
        />
        <Route
          index
          path="/posts"
          element={<LayoutWithSidePanel page={<PostListPage />} />}
        />
        <Route
          index
          path="/posts/:socialNetworkName/:postId"
          element={<PostDetailPage />}
        />
        <Route
          index
          path="/help"
          element={<LayoutWithSidePanel page={<HelpPage />} />}
        />
        <Route
          index
          path="/help/product"
          element={<LayoutWithSidePanel page={<ProductHelpPage />} />}
        />
        <Route
          index
          path="/help/harrasement"
          element={<LayoutWithSidePanel page={<HarrasementHelpPage />} />}
        />
        <Route
          index
          path="/help/privacy-policy"
          element={<LayoutWithSidePanel page={<PrivacyPolicyPage />} />}
        />

        <Route path="/build-report" element={<BuildReport />} />

        <Route
          path="/contact-support"
          element={<LayoutWithSidePanel page={<ContactSupport />} />}
        />

        {/* Dev pages */}
        <Route
          index
          path="/post-snapshots"
          element={<LayoutWithSidePanel page={<PostSnapshotListPage />} />}
        />
        <Route
          path="/post-snapshots/:snapshotId"
          element={<PostSnapshotDetailPage />}
        />
        <Route
          path="/debug"
          element={<LayoutWithSidePanel page={<DebugPage />} />}
        />
      </Routes>
    </HashRouter>
  );
}
