import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import type { PublicationDate } from "@/shared/model/PublicationDate";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapableSocialNetworkPage } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { extractIsoDateFromPostInfoTooltipText } from "./utils/extractIsoDateFromPostInfoTooltipText";
import type { Author } from "@/shared/model/Author";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { coverImageUrl } from "./utils/coverImageUrl";
import { YoutubeVideoCommentsScraper } from "./YoutubeVideoCommentsScraper";
import { parseIntegerSwallowingSeparators } from "./utils/parseIntegerSwallowingSeparators";

const logger = createLogger("[CS - YoutubeVideoScraper]");

export class YoutubeVideoScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private pageInfo: ScrapableSocialNetworkPage,

    private progressManager: ProgressManager,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

    // Pause video to ensure it doesn't autoplay next video during scraping..."
    logger.debug("Pause video...");
    (
      await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "video",
        HTMLVideoElement,
      )
    ).pause();

    const url = document.URL;
    const scrapedAt = currentIsoDate();
    const id = crypto.randomUUID();
    const postId = this.pageInfo.postId;

    logger.debug("Scraping title...");
    const title = await this.scrapPostTitle();
    logger.debug(`title: ${title}`);

    logger.debug("Scraping author...");
    const author = await this.scrapPostAuthor();
    logger.debug(`author.name: ${author.name}`);

    logger.debug("Scraping textContent...");
    const textContent = await this.scrapPostTextContent();
    logger.debug(`textContent: ${textContent.replaceAll("\n", "")}`);

    logger.debug("Scraping publishedAt...");
    const publishedAt = await this.scrapPostPublishedAt();
    logger.debug(`publishedAt: ${JSON.stringify(publishedAt)}`);

    const commentsContainer = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "#comments",
      HTMLElement,
    );
    const expectedCommentCount = await this.scrapExpectedCommentCount();

    const comments = await new YoutubeVideoCommentsScraper(
      this.scrapingSupport,
      this.progressManager,
      commentsContainer,
      expectedCommentCount,
    ).scrapComments();
    return {
      id,
      postId,
      socialNetwork: SocialNetwork.YouTube,
      scrapedAt,
      coverImageUrl: coverImageUrl(this.pageInfo.postId),
      url,
      author: author,
      publishedAt: publishedAt,
      textContent,
      comments: comments,
      title,
    };
  }

  private async scrapPostTitle(): Promise<string> {
    const titleElement = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      ".watch-active-metadata #title",
      HTMLElement,
      {
        predicate: (e) => this.scrapingSupport.isVisible(e),
      },
    );

    return titleElement.innerText;
  }

  private async scrapPostTextContent(): Promise<string> {
    const descriptionElement =
      await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "div#description",
        HTMLDivElement,
        {
          predicate: (e) => this.scrapingSupport.isVisible(e),
        },
      );
    const snippetText = await this.scrapingSupport.waitForSelectorOrThrow(
      descriptionElement,
      "#snippet-text",
      HTMLElement,
      // Snippet text is hidden and empty when no video description
    );

    return snippetText.innerText;
  }

  private async scrapPostPublishedAt(): Promise<PublicationDate> {
    const infoElement = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "#description #info",
      HTMLElement,
      {
        predicate: (e) => this.scrapingSupport.isVisible(e),
      },
    );

    // Open tooltip by triggering mouseenter
    infoElement.dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    const tooltipText = (
      await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "#description #tooltip",
        HTMLElement,
      )
    ).innerText;
    return {
      type: "absolute",
      date: extractIsoDateFromPostInfoTooltipText(tooltipText),
    };
  }

  private async scrapPostAuthor(): Promise<Author> {
    const ownerElement = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "#owner",
      HTMLElement,
    );
    const channelNameEl = this.scrapingSupport.select(
      ownerElement,
      "#channel-name",
      HTMLElement,
    );

    if (channelNameEl && this.scrapingSupport.isVisible(channelNameEl)) {
      const channelName = channelNameEl.innerText;

      const link = this.scrapingSupport.selectOrThrow(
        channelNameEl,
        "a",
        HTMLAnchorElement,
      );
      const channelUrl = link.href;
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    const attributedChannelNameEl = this.scrapingSupport.select(
      ownerElement,
      "#attributed-channel-name",
      HTMLElement,
    );
    if (
      attributedChannelNameEl &&
      this.scrapingSupport.isVisible(attributedChannelNameEl)
    ) {
      const channelName = attributedChannelNameEl.innerText;

      const link = this.scrapingSupport.selectOrThrow(
        attributedChannelNameEl,
        "a",
        HTMLAnchorElement,
      );
      const channelUrl = link.href;
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    throw new Error("Failed to scrap post author");
  }

  private async scrapExpectedCommentCount(): Promise<number> {
    const countContainer = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "#comments #count",
      HTMLElement,
    );
    countContainer.scrollIntoView();
    const commentsCountContainer =
      await this.scrapingSupport.waitForSelectorOrThrow(
        countContainer,
        "span:nth-of-type(1)",
        HTMLElement,
      );

    return parseIntegerSwallowingSeparators(commentsCountContainer.innerText);
  }
}
