import { CommentSnapshot, PostSnapshot } from "@/shared/model/PostSnapshot";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import {
  INVALID_TT_VIDEOURL,
  parseTiktokVideoUrl,
} from "./url/parseTiktokVideoUrl";
import { Author } from "@/shared/model/Author";
import { tiktokAccountHref } from "./url/tiktokAccountHref";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { TOGGLE_COMMENTS_BUTTON_ARIA_LABEL } from "./tiktokElementsTexts";
import { hasClassNameWithSuffix } from "./dom/hasClassNameWithSuffix";
import { fetchUrlContentAsDataUrl } from "@/shared/scraping/fetchUrlContentAsDataUrl";

const logger = createLogger("[CS - TiktokPostScraper]");

export class TiktokPostScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const result = parseTiktokVideoUrl(url);
    if (result === INVALID_TT_VIDEOURL) {
      throw new Error(INVALID_TT_VIDEOURL);
    }
    const scrapedAt = currentIsoDate();
    const id = crypto.randomUUID();
    const postId = result.postId;

    const videoContainer = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "article#one-column-item-0",
      HTMLElement,
    );

    const video = await this.scrapingSupport.waitForSelectorOrThrow(
      videoContainer,
      "video",
      HTMLVideoElement,
    );
    video.pause();

    const coverImageUrl = await this.scrapCoverImage(videoContainer);

    const author: Author = {
      name: result.accountId,
      accountHref: tiktokAccountHref(result.accountId),
    };

    const textContent = (
      await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "meta[property='og:description']",
        HTMLMetaElement,
      )
    ).content;

    // TODO find a way to get publishedAt.
    const publishedAt: PublicationDate = {
      type: "absolute",
      date: currentIsoDate(),
    };
    logger.debug("Post info extracted:", {
      coverImageUrl,
      author,
      textContent,
      publishedAt,
    });
    const comments: CommentSnapshot[] =
      await this.scrapComments(videoContainer);

    return {
      id,
      socialNetwork: SocialNetwork.TikTok,
      postId,
      author,
      publishedAt,
      textContent,
      scrapedAt,
      url,
      coverImageUrl,
      comments,
    };
  }

  private async scrapCoverImage(videoContainer: HTMLElement) {
    const imageSrc = (
      await this.scrapingSupport.waitForSelectorOrThrow(
        videoContainer,
        "picture img",
        HTMLImageElement,
      )
    ).src;
    // Convert to data url to avoid url expiry
    return await fetchUrlContentAsDataUrl(imageSrc);
  }

  async scrapComments(videoContainer: HTMLElement): Promise<CommentSnapshot[]> {
    const commentsContainer =
      await this.openCommentsSideNavAndFindCommentsContainer(videoContainer);

    // TODO load comments
    // List comments
    // Scrap comments

    const commentElements = this.scrapingSupport.selectAll(
      commentsContainer,
      "div",
      HTMLDivElement,
      {
        predicate: (e) => hasClassNameWithSuffix(e, "DivCommentObjectWrapper"),
      },
    );
    console.log(commentsContainer, commentElements.length);

    return [];
  }

  async openCommentsSideNavAndFindCommentsContainer(
    videoContainer: HTMLElement,
  ): Promise<HTMLElement> {
    const commentsToggleButton =
      await this.findToggleCommentsButton(videoContainer);
    const sidePanelPredicate = (b: HTMLElement) =>
      hasClassNameWithSuffix(b, "DivVideoListTabBarWrapper");
    let sidePanel = this.scrapingSupport.select(
      document,
      "div",
      HTMLDivElement,
      { predicate: sidePanelPredicate },
    );
    if (!sidePanel) {
      // First click opens side panel
      await this.scrapingSupport.click(commentsToggleButton);
      sidePanel = await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "div",
        HTMLDivElement,
        { predicate: sidePanelPredicate },
      );
    }

    const commentsContainerPredicate = (b: HTMLElement) =>
      hasClassNameWithSuffix(b, "DivCommentListContainer");
    let commentsContainer = this.scrapingSupport.select(
      document,
      "div",
      HTMLDivElement,
      { predicate: commentsContainerPredicate },
    );
    if (!commentsContainer) {
      // Second click toggle the  side panel tab
      await this.scrapingSupport.click(commentsToggleButton);
      commentsContainer = await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "div",
        HTMLDivElement,
        { predicate: commentsContainerPredicate },
      );
    }

    return commentsContainer;
  }

  async findToggleCommentsButton(
    videoContainer: HTMLElement,
  ): Promise<HTMLElement> {
    return this.scrapingSupport.waitForSelectorOrThrow(
      videoContainer,
      "[role='button']",
      HTMLElement,
      {
        predicate: (b) =>
          b.ariaLabel !== null &&
          TOGGLE_COMMENTS_BUTTON_ARIA_LABEL.test(b.ariaLabel),
      },
    );
  }
}
