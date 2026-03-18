import { PropsWithChildren, useEffect } from "react";

export function ThemeInitializer({ children }: PropsWithChildren) {
  useInitializeTheme();
  return <>{children}</>;
}

function useInitializeTheme() {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";

    root.classList.add(systemTheme);
  }, []);
}
