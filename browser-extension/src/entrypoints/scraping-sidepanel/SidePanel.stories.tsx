import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidePanelContent } from "./SidePanel";
import { ScrapingAndClassificationTabInfoType } from "./useScrapingAndClassificationTabInfo";

import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { Post, PostComment } from "@/shared/model/post/Post";

const meta = {
  title: "entrypoints/SidePanel",
  component: SidePanelContent,
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE,
      tabId: 42,
    },
  },
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "reset",
      options: {
        webextsidepanel: {
          name: "WebExtSidePanel",
          styles: {
            width: "360px",
            height: "680px",
          },
        },
      },
    },
  },
  globals: {
    viewport: { value: "webextsidepanel", isRotated: false },
  },
} satisfies Meta<typeof SidePanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotScrapable: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE,
      tabId: 42,
    },
  },
};

export const ScrapingNotStarted: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "not-started",
      },
    },
  },
};

export const ScrapingInProgress: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.SCRAPING_IN_PROGRESS,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "running",
        progress: 42,
      },
    },
  },
};
export const ClassificationInProgress: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_IN_PROGRESS,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "succeeded",
        postSnapshotId: "xxx-xxx-xxx",
        durationMs: 1550,
      },
    },
  },
};

export const ClassificationSucceededWithoutHate: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_SUCCEEDED,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "succeeded",
        postSnapshotId: "xxx-xxx-xxx",
        durationMs: 1550,
      },
      snapshot: {} as unknown as PostSnapshot,
      post: mockPost([
        mockPostComment("joe", false),
        mockPostComment("jane", false),
      ]),
    },
  },
};

export const ClassificationSucceededWithHate: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_SUCCEEDED,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "succeeded",
        postSnapshotId: "xxx-xxx-xxx",
        durationMs: 1550,
      },
      snapshot: {} as unknown as PostSnapshot,
      post: mockPost([
        mockPostComment("joe", true),
        mockPostComment("jane", false),
      ]),
    },
  },
};

export const ScrapingCanceled: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.SCRAPING_CANCELED,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "canceled",
      },
    },
  },
};

export const ScrapingFailed: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.SCRAPING_FAILED,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "failed",
        errorMessage: "The unexpected error text",
      },
    },
  },
};
export const ClassificationFailed: Story = {
  args: {
    tabInfo: {
      type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_FAILED,
      tabId: 42,
      pageInfo: {
        isScrapablePost: true,
        socialNetwork: SocialNetwork.YouTube,
        postId: "xxx",
      },
      scrapingStatus: {
        type: "succeeded",
        postSnapshotId: "xxx-xxx-xxx",
        durationMs: 1550,
      },
      snapshot: {
        classificationJobId: "jobid-xxx-xxx",
      } as unknown as PostSnapshot,
    },
  },
};

function mockPostComment(authorName: string, hatefull: boolean): PostComment {
  return {
    author: {
      name: authorName,
      accountHref: "",
    },
    textContent: "content",
    classification: hatefull ? ["Cyberharcèlement (autre)"] : [],
  } as PostComment;
}

function mockPost(comments: PostComment[]): Post {
  return {
    comments,
  } as Post;
}
