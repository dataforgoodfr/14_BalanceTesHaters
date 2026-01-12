import React from "react";
import ReactDOM from "react-dom/client";
import ReportPage from "./ReportPage.tsx";
import "../shared/main-style.css";
import { HashRouter, Route, Routes } from "react-router";
import PostDetailPage from "./posts/PostScrapDetails.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route index path="/" element={<ReportPage />} />
        <Route path="/posts/:postId" element={<PostDetailPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
