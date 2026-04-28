import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { XIcon } from "lucide-react";
const meta = {
  title: "ui/Button",
  component: Button,
  decorators: [],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  args: {
    children: "My Button",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SizeLG: Story = {
  args: {
    size: "lg",
  },
};

export const SizeSM: Story = {
  args: {
    size: "sm",
  },
};
export const SizeXS: Story = {
  args: {
    size: "xs",
  },
};

export const VariantDefault: Story = {
  args: {},
};

export const VariantDestructive: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <XIcon />
        Arrêter
      </>
    ),
  },
};

export const VariantGhosts: Story = {
  args: {
    variant: "ghost",
  },
};

export const VariantOutline: Story = {
  args: {
    variant: "outline",
  },
};
