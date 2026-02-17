import { Author, Post, Comment, PublicationDate } from "@/shared/model/post";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { parseSocialNetworkUrl } from "@/shared/social-network-url";
import {
  selectOrThrow,
  select,
  selectAll,
} from "../../shared/dom-scraping/dom-scraping";

const LOG_PREFIX = "[CS - InstagramPostNativeScraper] ";

type InstagramPostElements = {
  channelHeader: HTMLElement;
  scrollableArea: HTMLElement;
  commentsContainer: HTMLElement;
};

export class InstagramPostNativeScraper {
  private INSTAGRAM_URL = "https://www.instagram.com/";

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
    const author = this.scrapPostAuthor(postElements);
    this.debug(`author.name: ${author.name}`);

    this.debug("Scraping textContent...");
    const textContent = this.scrapPostTextContent(postElements);
    this.debug(`textContent: ${textContent.replaceAll("\n", "")}`);

    this.debug("Scraping publishedAt...");
    const publishedAt = this.scrapPostPublishedAt(postElements);
    this.debug(`publishedAt: ${publishedAt}`);

    this.debug("Scraping comments...");
    const comments: Comment[] = await this.scrapPostComments(postElements);
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

    const commentsContainer = selectOrThrow(
      scrollableArea,
      ":scope>div>div:nth-of-type(3)",
      HTMLElement,
    );

    return {
      channelHeader,
      scrollableArea,
      commentsContainer,
    };
  }

  private scrapPostAuthor(postElements: InstagramPostElements): Author {
    const channelElement = selectOrThrow(
      postElements.channelHeader,
      ":scope a",
      HTMLElement,
    );
    const channelElementHref = channelElement.getAttribute("href")!;
    const channelName = selectOrThrow(
      channelElement,
      ":scope span",
      HTMLElement,
    ).textContent;
    const channelUrl = new URL(
      channelElementHref,
      this.INSTAGRAM_URL,
    ).toString();

    return {
      name: channelName,
      accountHref: channelUrl,
    };
  }

  private scrapPostTextContent(postElements: InstagramPostElements): string {
    const textContentElement = selectOrThrow(
      postElements.scrollableArea,
      ":scope span>div>span",
      HTMLElement,
    );
    return textContentElement.textContent;
  }

  private scrapPostPublishedAt(
    postElements: InstagramPostElements,
  ): PublicationDate {
    const timeElement = selectOrThrow(
      postElements.scrollableArea,
      ":scope time",
      HTMLElement,
    );
    return {
      type: "absolute",
      date: timeElement.getAttribute("datetime")!,
    };
  }

  private async scrapPostComments(
    postElements: InstagramPostElements,
  ): Promise<Comment[]> {
    postElements.commentsContainer.scrollIntoView();

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments(postElements);

    const comments = this.scrapCommentThreads(postElements);
    this.debug("Comments metada:", comments);

    // TODO: Sort by newest
    // TODO: Take screenshots
    // TODO: Scrap replies
    // TODO: Make it work on Reels

    return comments;
  }

  private async loadAllTopLevelComments(postElements: InstagramPostElements) {
    let spinner = this.selectSpinner(postElements);
    // TODO Improve this function.
    // Make sure this doesn't result in an infinite loop because of an error. Define a timeout.
    // Make sure every comment is scraped.
    // I think it should not be that different from the processing of the youtube scraper.
    while (spinner) {
      spinner.scrollIntoView();
      // Wait a bit to let page load stuff
      await new Promise((resolve) => setTimeout(resolve, 500));
      spinner = this.selectSpinner(postElements);
    }
  }

  private selectSpinner(
    postElements: InstagramPostElements,
  ): HTMLElement | undefined {
    return select(
      postElements.commentsContainer,
      ":scope [role=progressbar]",
      HTMLElement,
    );
  }

  private scrapCommentThreads(postElements: InstagramPostElements): Comment[] {
    const comments: Comment[] = [];
    const commentElements = selectAll(
      postElements.commentsContainer,
      ":scope>div",
      HTMLElement,
    );
    for (const comment of commentElements) {
      comments.push(this.scrapCommentThread(comment));
    }
    return comments;
  }

  private scrapCommentThread(_: HTMLElement): Comment {
    // TODO scrap the comment
    return {
      id: crypto.randomUUID(),
      author: {
        name: "",
        accountHref: "",
      },
      textContent: "",
      publishedAt: {
        type: "absolute",
        date: "",
      },
      screenshotData: "screenshot",
      scrapedAt: "screenshotDate",
      replies: [],
      nbLikes: 0, // See https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
    };
  }
}
