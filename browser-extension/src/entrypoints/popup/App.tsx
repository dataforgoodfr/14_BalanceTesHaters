import "./App.css";
import { useInitializeTheme } from "@/styles/useInitializeTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Popup } from "./Popup";

const queryClient = new QueryClient();

export default function App() {
  useInitializeTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <Popup />
    </QueryClientProvider>
  );
}
