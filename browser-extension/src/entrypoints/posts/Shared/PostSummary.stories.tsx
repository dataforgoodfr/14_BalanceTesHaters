import type { Meta, StoryObj } from "@storybook/react-vite";

import PostSummary from "./PostSummary";
import { Post, PostComment } from "@/shared/model/post/Post";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { categoryCyberHarcelementAutre } from "@/shared/utils/post-util";
const meta = {
  title: "Shared/PostSummary",
  component: PostSummary,
} satisfies Meta<typeof PostSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const exampleComment: PostComment = {
  author: { name: "Joe", accountHref: "accountHref" },
  textContent: "",
  isDeleted: false,
  isNew: false,
  publishedAt: {
    type: "absolute",
    date: "2026-03-22T00:00:00.000Z",
  },
  screenshotData: "",
};

const inProgressPost: Post = {
  author: { name: "Author Name", accountHref: "authAccountHref" },
  postId: "xxx",
  socialNetwork: SocialNetwork.YouTube,
  title: "Salomé Saqué, Franceinfo, Sois jeune et tais-toi",
  url: "https://www.youtube.com/watch?v=m0cSAxflCCs&t=10s",
  coverImageUrl: "https://i.ytimg.com/vi/m0cSAxflCCs/hq720.jpg",
  publishedAt: {
    type: "absolute",
    date: "2026-03-22T00:00:00.000Z",
  },
  comments: Array<PostComment>(100).fill(exampleComment),
  latestAnalysisDate: "2026-03-22T00:00:00.000Z",
  latestAnalysisStatus: "IN_PROGRESS",
  firstAnalysisDate: "2026-03-22T00:00:00.000Z",
  analysisCount: 1,
};

const completedPost: Post = {
  ...inProgressPost,
  comments: [
    ...Array<PostComment>(75).fill(exampleComment),
    ...Array<PostComment>(25).fill({
      ...exampleComment,
      classification: [categoryCyberHarcelementAutre],
    }),
  ],
  latestAnalysisStatus: "COMPLETED",
};

export const InProgress: Story = {
  args: {
    post: inProgressPost,
  },
};

export const Completed: Story = {
  args: {
    post: completedPost,
  },
};
