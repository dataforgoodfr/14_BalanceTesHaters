import { PropsWithChildren, useEffect } from "react";

export function ThemeInitializer({ children }: PropsWithChildren) {
  useInitializeTheme();
  return <>{children}</>;
}

function useInitializeTheme() {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    root.classList.add(selectTheme());
  }, []);
}

// Dark theme is not yet specified in mockups
const forceLightTheme = true;
function selectTheme(): "dark" | "light" {
  if (forceLightTheme) {
    return "light";
  } else {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
}
