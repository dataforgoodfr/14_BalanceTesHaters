import React from "react";
import ReactDOM from "react-dom/client";
import "@/styles/global.css";
import { Popup } from "./Popup";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInitializer } from "@/styles/ThemeInitializer.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./main.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer>
          <Popup />
        </ThemeInitializer>
      </QueryClientProvider>
    </TooltipProvider>
  </React.StrictMode>,
);
