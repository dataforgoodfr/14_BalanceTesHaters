import type { Meta, StoryObj } from "@storybook/react-vite";

import KpiCard from "./KpiCard";
const meta = {
  title: "Shared/KpiCard",
  component: KpiCard,
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isLoading: false,
    title: "Part des commentaires haineux",
    value: "6%",
    isWorkInProgress: false,
  },
};
export const Loading: Story = {
  args: {
    isLoading: true,
    title: "Part des commentaires haineux",
    value: "6%",
    isWorkInProgress: false,
  },
};

export const WorkInProgress: Story = {
  args: {
    isLoading: false,
    title: "Part des commentaires haineux",
    value: "6%",
    isWorkInProgress: true,
  },
};
