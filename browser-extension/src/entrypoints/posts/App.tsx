import { HashRouter, Route, Routes } from "react-router";
import PostListPage from "./PostListPage";
import PostDetailPage from "./PostDetailPage";
import { useInitializeTheme } from "@/styles/useInitializeTheme";
import "./App.css";
import { DebugPage } from "./DebugPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

export default function App() {
  useInitializeTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route index path="/" element={<PostListPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/:postId/:scrapedAt" element={<PostDetailPage />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
