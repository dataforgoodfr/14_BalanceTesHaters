import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { Author } from "@/shared/model/Author";
import { INSTAGRAM_URL, instagramPageInfo } from "./instagramPageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

const LOG_PREFIX = "[CS - InstagramPostNativeScraper] ";

type InstagramPostElements = {
  channelHeader: HTMLElement;
  scrollableArea: HTMLElement;
};

/**
 * In a thread, sometimes a comment can not be parsed.
 * In that case there is nothing to scrap => failure.
 */
type CommentThread =
  | { scrapingStatus: "success"; comment: CommentSnapshot }
  | { scrapingStatus: "failure"; message: string };

export class InstagramPostNativeScraper {
  public constructor(private scrapingSupport: ScrapingSupport) {}

  private debug(...data: unknown[]) {
    console.debug(LOG_PREFIX, ...data);
  }

  async scrapPost(): Promise<PostSnapshot> {
    this.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const pageInfo = instagramPageInfo(url);
    if (!pageInfo.isScrapablePost) {
      throw new Error("Not on a scrapable page");
    }

    const scrapedAt = currentIsoDate();
    const postElements = this.selectPostElements();

    this.debug("Scraping author...");
    const author = this.scrapPostAuthor(postElements.channelHeader);
    this.debug(`author.name: ${author.name}`);

    this.debug("Scraping textContent...");
    const textContent = this.scrapPostTextContent(postElements.scrollableArea);
    this.debug(`textContent: ${textContent.replaceAll("\n", "")}`);

    this.debug("Scraping publishedAt...");
    const publishedAt = this.scrapPostPublishedAt(postElements.scrollableArea);
    this.debug(`publishedAt: ${JSON.stringify(publishedAt)}`);

    this.debug("Scraping comments...");
    const comments: CommentSnapshot[] = await this.scrapPostComments(
      postElements.scrollableArea,
    );
    this.debug(`${comments.length} comments`);

    return {
      id: crypto.randomUUID(),
      url,
      publishedAt,
      scrapedAt,
      author,
      comments,
      postId: pageInfo.postId,
      socialNetwork: SocialNetwork.Instagram,
      textContent,
    };
  }

  private selectPostElements(): InstagramPostElements {
    const socialContainer = this.selectSocialContainer();

    const channelHeader = this.scrapingSupport.selectOrThrow(
      socialContainer,
      ":scope>div:nth-of-type(1)",
      HTMLElement,
    );

    const scrollableArea = this.scrapingSupport.selectOrThrow(
      socialContainer,
      ":scope>div:nth-of-type(2)",
      HTMLElement,
    );

    return {
      channelHeader,
      scrollableArea,
    };
  }

  private selectSocialContainer(): HTMLElement {
    const selectors = [
      // Standard post page layout.
      "main>div>div>div>div:nth-of-type(2)>div",
      // Alternate page layout variant.
      "main>div>div>div>div:nth-of-type(1)>div",
      // Modal post layouts opened from profile/feed.
      '[role="dialog"] article>div>div:nth-of-type(2)',
      '[role="dialog"] article>div>div>div:nth-of-type(2)',
    ];

    const candidates = new Set<HTMLElement>();
    for (const selector of selectors) {
      for (const candidate of this.scrapingSupport.selectAll(
        document,
        selector,
        HTMLElement,
      )) {
        candidates.add(candidate);
      }
    }

    for (const candidate of candidates) {
      if (this.looksLikeSocialContainer(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      "Failed to resolve selector: social container for instagram post",
    );
  }

  private looksLikeSocialContainer(element: HTMLElement): boolean {
    const channelHeader = this.scrapingSupport.select(
      element,
      ":scope>div:nth-of-type(1)",
      HTMLElement,
    );
    if (!channelHeader) {
      return false;
    }

    const scrollableArea = this.scrapingSupport.select(
      element,
      ":scope>div:nth-of-type(2)",
      HTMLElement,
    );
    if (!scrollableArea) {
      return false;
    }

    const hasAuthor = this.scrapingSupport.select(
      channelHeader,
      ":scope a span",
      HTMLElement,
    );
    if (!hasAuthor) {
      return false;
    }

    const hasTime = this.scrapingSupport.select(
      scrollableArea,
      ":scope time",
      HTMLElement,
    );
    return Boolean(hasTime);
  }

  private scrapPostAuthor(channelHeader: HTMLElement): Author {
    const channelElement = this.scrapingSupport.selectOrThrow(
      channelHeader,
      ":scope a",
      HTMLElement,
    );
    const channelElementHref = channelElement.getAttribute("href")!;
    const channelName = this.scrapingSupport.selectOrThrow(
      channelElement,
      ":scope span",
      HTMLElement,
    ).textContent;
    const channelUrl = new URL(channelElementHref, INSTAGRAM_URL).toString();

    return {
      name: channelName,
      accountHref: channelUrl,
    };
  }

  private scrapPostTextContent(element: HTMLElement): string {
    const textContentElement = this.scrapingSupport.selectOrThrow(
      element,
      ":scope span>div>span",
      HTMLElement,
    );
    return textContentElement.textContent;
  }

  private scrapPostPublishedAt(element: HTMLElement): PublicationDate {
    const timeElement = this.scrapingSupport.selectOrThrow(
      element,
      ":scope time",
      HTMLElement,
    );
    return {
      type: "absolute",
      date: timeElement.getAttribute("datetime")!,
    };
  }

  private async scrapPostComments(
    element: HTMLElement,
  ): Promise<CommentSnapshot[]> {
    const commentsContainer = this.selectCommentsContainer(element);
    commentsContainer.scrollIntoView();

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments(commentsContainer);

    this.debug("Expanding all replies...");
    await this.loadAllReplies(commentsContainer);

    const comments = this.scrapCommentThreads(commentsContainer);
    this.debug("Comments metadata:", comments);

    return comments;
  }

  private selectCommentsContainer(element: HTMLElement): HTMLElement {
    const selectors = [
      ":scope>div>div:nth-of-type(3)",
      ":scope>div>div:nth-of-type(2)",
      ":scope>div:nth-of-type(3)",
      ":scope>div:nth-of-type(2)",
      ":scope>div>ul",
      ":scope>ul",
    ];

    let selected: HTMLElement | undefined;
    let selectedScore = -1;

    for (const selector of selectors) {
      const candidate = this.scrapingSupport.select(
        element,
        selector,
        HTMLElement,
      );
      if (!candidate) {
        continue;
      }

      const score = this.scoreCommentsContainer(candidate);
      if (score > selectedScore) {
        selected = candidate;
        selectedScore = score;
      }
    }

    const elementScore = this.scoreCommentsContainer(element);
    if (elementScore > selectedScore) {
      selected = element;
      selectedScore = elementScore;
    }

    if (selected && selectedScore > 0) {
      return selected;
    }

    throw new Error("Failed to resolve selector: " + selectors.join(" or "));
  }

  private scoreCommentsContainer(element: HTMLElement): number {
    const hasSpinner = this.scrapingSupport.select(
      element,
      ':scope [role="progressbar"]',
      HTMLElement,
    )
      ? 1
      : 0;
    const directThreadCount = this.scrapingSupport.selectAll(
      element,
      ":scope>div>div",
      HTMLElement,
    ).length;
    const listItemCount = this.scrapingSupport.selectAll(
      element,
      ":scope li",
      HTMLElement,
    ).length;
    const timedCommentCount = this.scrapingSupport.selectAll(
      element,
      ":scope time[datetime]",
      HTMLElement,
    ).length;

    // Prioritize containers that look like actual comments blocks.
    return (
      timedCommentCount * 4 + listItemCount * 2 + directThreadCount + hasSpinner
    );
  }

  private async loadAllTopLevelComments(commentsContainer: HTMLElement) {
    let spinner = this.selectSpinner(commentsContainer);
    // TODO Improve this function.
    // Make sure this doesn't result in an infinite loop because an error. Define a timeout.
    // Make sure every comment is scraped.
    // I think it should not be that different from the processing of the youtube scraper.
    while (spinner) {
      await this.scrapingSupport.resumeHostPage(); // throws if aborted

      spinner.scrollIntoView();
      // Wait a bit to let page load stuff
      await new Promise((resolve) => setTimeout(resolve, 500));
      spinner = this.selectSpinner(commentsContainer);
    }
  }

  private async loadAllReplies(commentsContainer: HTMLElement) {
    const repliesThreadElements = this.scrapingSupport.selectAll(
      commentsContainer,
      ":scope>div>div:nth-of-type(2)",
      HTMLElement,
    );

    for (const replyThreadElement of repliesThreadElements) {
      const expandRepliesElement = this.scrapingSupport.select(
        replyThreadElement,
        ":scope>div>div>span",
        HTMLElement,
      );
      if (!expandRepliesElement) {
        continue;
      }
      expandRepliesElement.scrollIntoView();
      expandRepliesElement.click();
    }

    await Promise.all(
      repliesThreadElements.map((replyThreadElement) =>
        this.loadMoreReplies(replyThreadElement),
      ),
    );
  }

  private async loadMoreReplies(replyThreadElement: HTMLElement) {
    for (;;) {
      const waitForSelectorResult = await this.scrapingSupport.waitForSelector(
        replyThreadElement,
        ":scope>div:nth-of-type(2)>div>span",
        HTMLElement,
        {
          timeout: 2000,
        },
      );
      if (waitForSelectorResult.status === "failure") {
        return;
      }
      const nextLoadMoreMessageElement = waitForSelectorResult.element;
      nextLoadMoreMessageElement.scrollIntoView();
      nextLoadMoreMessageElement.click();
    }
  }

  private selectSpinner(
    commentsContainer: HTMLElement,
  ): HTMLElement | undefined {
    return this.scrapingSupport.select(
      commentsContainer,
      ":scope [role=progressbar]",
      HTMLElement,
    );
  }

  private scrapCommentThreads(
    commentsContainer: HTMLElement,
  ): CommentSnapshot[] {
    const commentThreads: CommentThread[] = [];
    let commentThreadContainers = this.scrapingSupport.selectAll(
      commentsContainer,
      ":scope>div",
      HTMLElement,
    );
    if (commentThreadContainers.length === 0) {
      commentThreadContainers = this.scrapingSupport.selectAll(
        commentsContainer,
        ":scope>ul>li",
        HTMLElement,
      );
    }

    for (const commentThread of commentThreadContainers) {
      commentThreads.push(this.scrapCommentThread(commentThread));
    }

    return commentThreads
      .filter((thread) => thread.scrapingStatus === "success")
      .map((thread) => thread.comment);
  }

  private scrapCommentThread(commentElement: HTMLElement): CommentThread {
    const commentThreadContentElement = this.scrapingSupport.select(
      commentElement,
      ":scope>div",
      HTMLElement,
    );
    if (!commentThreadContentElement) {
      return {
        scrapingStatus: "failure",
        message:
          "Could not scrap comment thread: missing :scope>div in thread container",
      };
    }

    const commentThread = this.scrapCommentThreadContent(
      commentThreadContentElement,
    );

    if (commentThread.scrapingStatus === "failure") {
      return commentThread;
    }

    const repliesContainer = this.scrapingSupport.select(
      commentElement,
      ":scope>div:nth-of-type(2)>ul",
      HTMLElement,
    );

    if (repliesContainer) {
      commentThread.comment.replies =
        this.scrapCommentReplies(repliesContainer);
    }

    return commentThread;
  }

  private scrapCommentReplies(
    repliesContainer: HTMLElement,
  ): CommentSnapshot[] {
    const replies: CommentThread[] = [];
    const repliesElements = this.scrapingSupport.selectAll(
      repliesContainer,
      ":scope>div",
      HTMLElement,
    );

    for (const reply of repliesElements) {
      replies.push(this.scrapCommentThreadContent(reply));
    }

    return replies
      .filter((thread) => thread.scrapingStatus === "success")
      .map((thread) => thread.comment);
  }

  private scrapCommentThreadContent(
    commentThreadContentElement: HTMLElement,
  ): CommentThread {
    const baseElement = this.scrapingSupport.select(
      commentThreadContentElement,
      ":scope>div>div:nth-of-type(2)>div>div",
      HTMLElement,
    );

    if (!baseElement) {
      return {
        scrapingStatus: "failure",
        message: "Could not scrap element " + baseElement,
      };
    }

    // TODO Scrap media such as images. For now, skip comments that uses media.
    const image = this.scrapingSupport.select(
      baseElement,
      ":scope img",
      HTMLElement,
    );

    if (image) {
      return {
        scrapingStatus: "failure",
        message: "Scraping images comments is not supported yet",
      };
    }

    const postContent = this.scrapingSupport.select(
      baseElement,
      ":scope>div>div:nth-of-type(2)>span",
      HTMLElement,
    );

    const channelHeader = this.scrapingSupport.selectOrThrow(
      baseElement,
      ":scope>div>div",
      HTMLElement,
    );

    const author = this.scrapPostAuthor(channelHeader);
    const scrapedAt = currentIsoDate();
    const publishedAt = this.scrapPostPublishedAt(channelHeader);

    return {
      scrapingStatus: "success",
      comment: {
        id: crypto.randomUUID(),
        author,
        textContent: postContent?.textContent ?? "",
        publishedAt: publishedAt,
        // TODO Crop a screenshot of the whole page. HTMLElement doesn't have a screenshot method such as Puppeteer.
        screenshotData: "",
        scrapedAt,
        replies: [],
        nbLikes: 0, // See https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
      },
    };
  }
}
