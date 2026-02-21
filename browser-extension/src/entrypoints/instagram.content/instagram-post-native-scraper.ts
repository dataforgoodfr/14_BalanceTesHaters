import { Author, Post, Comment, PublicationDate } from "@/shared/model/post";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { parseSocialNetworkUrl } from "@/shared/social-network-url";
import {
  selectOrThrow,
  select,
  selectAll,
} from "@/shared/dom-scraping/dom-scraping";
import { INSTAGRAM_URL } from "@/shared/social-network-url";

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
  | { scrapingStatus: "success"; comment: Comment }
  | { scrapingStatus: "failure"; message: string };

export class InstagramPostNativeScraper {
  public constructor() {}

  private debug(...data: typeof console.debug.arguments) {
    console.debug(LOG_PREFIX, ...data);
  }

  async scrapPost(): Promise<Post> {
    this.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const urlInfo = parseSocialNetworkUrl(url);
    if (!urlInfo) {
      throw new Error();
    }

    const startTime = Date.now();
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
    this.debug(`publishedAt: ${publishedAt}`);

    this.debug("Scraping comments...");
    const comments: Comment[] = await this.scrapPostComments(
      postElements.scrollableArea,
    );
    this.debug(`${comments.length} comments`);

    const duration = Date.now() - startTime;
    this.debug(`Scraping took ${duration}ms`);

    return {
      url,
      publishedAt,
      scrapedAt,
      author,
      comments,
      postId: urlInfo.postId,
      socialNetwork: "INSTAGRAM",
      textContent,
    };
  }

  private selectPostElements(): InstagramPostElements {
    const mainContainer = selectOrThrow(
      document,
      "main>div>div>div",
      HTMLElement,
    );

    const socialContainer = selectOrThrow(
      mainContainer,
      ":scope>div:nth-of-type(2)>div",
      HTMLElement,
    );

    const channelHeader = selectOrThrow(
      socialContainer,
      ":scope>div:nth-of-type(1)",
      HTMLElement,
    );

    const scrollableArea = selectOrThrow(
      socialContainer,
      ":scope>div:nth-of-type(2)",
      HTMLElement,
    );

    return {
      channelHeader,
      scrollableArea,
    };
  }

  private scrapPostAuthor(channelHeader: HTMLElement): Author {
    const channelElement = selectOrThrow(
      channelHeader,
      ":scope a",
      HTMLElement,
    );
    const channelElementHref = channelElement.getAttribute("href")!;
    const channelName = selectOrThrow(
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
    const textContentElement = selectOrThrow(
      element,
      ":scope span>div>span",
      HTMLElement,
    );
    return textContentElement.textContent;
  }

  private scrapPostPublishedAt(element: HTMLElement): PublicationDate {
    const timeElement = selectOrThrow(element, ":scope time", HTMLElement);
    return {
      type: "absolute",
      date: timeElement.getAttribute("datetime")!,
    };
  }

  private async scrapPostComments(element: HTMLElement): Promise<Comment[]> {
    const commentsContainer = selectOrThrow(
      element,
      ":scope>div>div:nth-of-type(3)",
      HTMLElement,
    );
    commentsContainer.scrollIntoView();

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments(commentsContainer);

    const comments = this.scrapCommentThreads(commentsContainer);
    this.debug("Comments metadata:", comments);

    return comments;
  }

  private async loadAllTopLevelComments(commentsContainer: HTMLElement) {
    let spinner = this.selectSpinner(commentsContainer);
    // TODO Improve this function.
    // Make sure this doesn't result in an infinite loop because of an error. Define a timeout.
    // Make sure every comment is scraped.
    // I think it should not be that different from the processing of the youtube scraper.
    while (spinner) {
      spinner.scrollIntoView();
      // Wait a bit to let page load stuff
      await new Promise((resolve) => setTimeout(resolve, 500));
      spinner = this.selectSpinner(commentsContainer);
    }
  }

  private selectSpinner(
    commentsContainer: HTMLElement,
  ): HTMLElement | undefined {
    return select(commentsContainer, ":scope [role=progressbar]", HTMLElement);
  }

  private scrapCommentThreads(commentsContainer: HTMLElement): Comment[] {
    const comments: CommentThread[] = [];
    const commentElements = selectAll(
      commentsContainer,
      ":scope>div",
      HTMLElement,
    );

    for (const comment of commentElements) {
      comments.push(this.scrapCommentThread(comment));
    }

    return comments
      .filter((thread) => thread.scrapingStatus === "success")
      .map((thread) => thread.comment);
  }

  private scrapCommentThread(commentElement: HTMLElement): CommentThread {
    const baseElement = selectOrThrow(
      commentElement,
      ":scope>div>div>div:nth-of-type(2)>div>div",
      HTMLElement,
    );

    // TODO Scrap media such as images. For now, skip comments that uses media.
    const image = select(baseElement, ":scope img", HTMLElement);

    if (image) {
      return {
        scrapingStatus: "failure",
        message: "Scraping images posts is not supported yet",
      };
    }

    const postContent = selectOrThrow(
      baseElement,
      ":scope>div>div:nth-of-type(2)>span",
      HTMLElement,
    );

    const channelHeader = selectOrThrow(
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
        textContent: postContent.textContent,
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
