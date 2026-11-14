import type { Meta, StoryObj } from "@storybook/react-vite";

import PostSummary from "./PostSummary";
import type {
  PostCommentWithFlag,
  PostWithFlags,
} from "@/shared/model/post/Post";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { AnnotatedCategory } from "@/shared/model/AnnotatedCategory";
const meta = {
  title: "Shared/PostSummary",
  component: PostSummary,
} satisfies Meta<typeof PostSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const exampleComment: PostCommentWithFlag = {
  author: { name: "Joe", accountHref: "accountHref" },
  textContent: "",
  isDeleted: false,
  isNew: false,
  isFlagged: false,
  publishedAt: {
    type: "absolute",
    date: "2026-03-22T00:00:00.000Z",
  },
};

const inProgressPost: PostWithFlags = {
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
  comments: Array<PostCommentWithFlag>(100).fill(exampleComment),
  latestAnalysisDate: "2026-03-22T00:00:00.000Z",
  latestAnalysisStatus: "IN_PROGRESS",
  firstAnalysisDate: "2026-03-22T00:00:00.000Z",
  analysisCount: 1,
};

const completedPost: PostWithFlags = {
  ...inProgressPost,
  comments: [
    ...Array<PostCommentWithFlag>(75).fill(exampleComment),
    ...Array<PostCommentWithFlag>(25).fill({
      ...exampleComment,
      classification: [AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE],
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
