import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeInitializer } from "@/styles/ThemeInitializer";
import "@/styles/global.css";
import "./main.css";
import { App } from "./App";
import { startSoakController } from "../../shared/soak-test/startSoakController";
import { soakControllerStore } from "../../shared/soak-test/SoakControllerStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeInitializer>
      <App store={soakControllerStore} />
    </ThemeInitializer>
  </React.StrictMode>,
);

startSoakController();
