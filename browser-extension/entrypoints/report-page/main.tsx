import React from "react";
import ReactDOM from "react-dom/client";
import ReportPageApp from "./ReportPage.tsx";
import "../shared/main-style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReportPageApp />
  </React.StrictMode>
);
