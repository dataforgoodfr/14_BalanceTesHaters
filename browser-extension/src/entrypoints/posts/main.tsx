import React from "react";
import ReactDOM from "react-dom/client";
import "@/styles/global.css";
import App from "./App.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeInitializer } from "@/styles/ThemeInitializer.tsx";
import "./main.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer>
          <App />
        </ThemeInitializer>
      </QueryClientProvider>
    </TooltipProvider>
  </React.StrictMode>,
);
