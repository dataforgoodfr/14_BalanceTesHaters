import React from "react";
import ReactDOM from "react-dom/client";
import { SidePanel } from "./SidePanel";
import "@/styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeInitializer } from "../../styles/ThemeInitializer";
import "./main.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer>
          <SidePanel />
        </ThemeInitializer>
      </QueryClientProvider>
    </TooltipProvider>
  </React.StrictMode>,
);
