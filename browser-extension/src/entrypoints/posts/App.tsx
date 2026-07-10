import { HashRouter, Route, Routes } from "react-router";
import PostSnapshotListPage from "./Developer/PostSnapshotListPage";
import PostSnapshotDetailPage from "./Developer/PostSnapshotDetailPage";
import { ScreenshotDebugPage } from "./Developer/screenshoting/ScreenshotDebugPage";
import HomePage from "./Home/HomePage";
import PostListPage from "./Posts/PostListPage";
import PostDetailPage from "./Posts/PostDetailPage";
import { BuildReport } from "./Report/Stepper/BuildReport";
import HelpPage from "./Help/HelpPage";
import ProductHelpPage from "./Help/ProductHelpPage";
import HarrasementHelpPage from "./Help/HarrasementHelpPage";
import PrivacyPolicyPage from "./Help/PrivacyPolicyPage";
import ContactSupport from "./ContactSupport/ContactSupport";
import LayoutWithSidePanel from "./LayoutWithSidePanel";
import { DocumentScreenshotingTestPage } from "./Developer/screenshoting/DocumentScreenshotingTestPage";
import { ElementScreenshotingTestPage } from "./Developer/screenshoting/ElementScreenshotingTestPage";
import { main } from "./Menu";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          index
          path={main.menuEntries.Overview.to}
          element={<LayoutWithSidePanel page={<HomePage />} />}
        />
        <Route
          index
          path={main.menuEntries.Posts.to}
          element={<LayoutWithSidePanel page={<PostListPage />} />}
        />
        <Route
          index
          path={main.menuEntries.Posts.to + "/:socialNetworkName/:postId"}
          element={<PostDetailPage />}
        />
        <Route
          index
          path={main.menuEntries.Help.to}
          element={<LayoutWithSidePanel page={<HelpPage />} />}
        />
        <Route
          index
          path={main.menuEntries.Product.to}
          element={<LayoutWithSidePanel page={<ProductHelpPage />} />}
        />
        <Route
          index
          path={main.menuEntries.Harrasement.to}
          element={<LayoutWithSidePanel page={<HarrasementHelpPage />} />}
        />
        <Route
          index
          path={main.menuEntries.Privacy.to}
          element={<LayoutWithSidePanel page={<PrivacyPolicyPage />} />}
        />

        <Route path="/build-report" element={<BuildReport />} />

        <Route
          path={main.menuEntries.ContactSupport.to}
          element={<LayoutWithSidePanel page={<ContactSupport />} />}
        />

        {/* Dev pages */}
        <Route
          index
          path={main.menuEntries.PostSnapshots.to}
          element={<LayoutWithSidePanel page={<PostSnapshotListPage />} />}
        />
        <Route
          path={main.menuEntries.PostSnapshots.to + "/:snapshotId"}
          element={<PostSnapshotDetailPage />}
        />
        <Route path="/dev/screenshot-debug" element={<ScreenshotDebugPage />} />
        <Route
          path="/dev/document-screenshot-test"
          element={<DocumentScreenshotingTestPage />}
        />
        <Route
          path="/dev/element-screenshot-test"
          element={<ElementScreenshotingTestPage />}
        />
      </Routes>
    </HashRouter>
  );
}
