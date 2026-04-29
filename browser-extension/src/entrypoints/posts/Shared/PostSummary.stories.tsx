import type { Meta, StoryObj } from "@storybook/react-vite";

import PostSummary from "./PostSummary";
const meta = {
  title: "Shared/PostSummary",
  component: PostSummary,
} satisfies Meta<typeof PostSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Salomé Saqué, Franceinfo, Sois jeune et tais-toi",
    url: "https://www.youtube.com/watch?v=m0cSAxflCCs&t=10s",
    coverImageUrl: "https://i.ytimg.com/vi/m0cSAxflCCs/hq720.jpg",
    publishedAt: {
      type: "absolute",
      date: "2026-03-22T00:00:00.000Z",
    },
  },
};
