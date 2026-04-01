import "@/styles/global.css";
import type { Preview } from "@storybook/react-vite";
import { sb } from "storybook/test";

sb.mock(import("../src/shared/extension-urls.ts"));

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
