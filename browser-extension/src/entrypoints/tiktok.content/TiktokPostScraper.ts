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
import { TiktokCommentsLoader } from "./comments/TiktokCommentsLoader";
import { TiktokLoadedCommentScraper } from "./comments/TiktokLoadedCommentScraper";
import { extractCreationDateFromTiktokVideoId } from "./extractCreationDateFromTiktokVideoId";
import {
  createScreenshotProviderForScrollableDescendants,
  ElementScreenshotProvider,
} from "@/shared/screenshoting";

const logger = createLogger("[CS - TiktokPostScraper]");

export class TiktokPostScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

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
    const url = document.URL;
    const result = parseTiktokVideoUrl(url);
    if (result === INVALID_TT_VIDEOURL) {
      throw new Error(INVALID_TT_VIDEOURL);
    }
    const scrapedAt = currentIsoDate();
    const id = crypto.randomUUID();
    const postId = result.postId;

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

    const publishedAt: PublicationDate =
      extractCreationDateFromTiktokVideoId(postId);
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

  private async scrapComments(
    videoContainer: HTMLElement,
  ): Promise<CommentSnapshot[]> {
    const commentsContainer =
      await this.openCommentsSideNavAndFindCommentsContainer(videoContainer);

    const expectedCommentsCount =
      await this.scrapExpectedCommentsCount(commentsContainer);

    const loadCommentsProgressMgr = this.progressManager.subTaskProgressManager(
      {
        from: 0,
        to: 45,
      },
    );
    const captureScreenshotsProgressMgr =
      this.progressManager.subTaskProgressManager({
        from: 45,
        to: 90,
      });
    const scrapContentProgressMgr = this.progressManager.subTaskProgressManager(
      {
        from: 90,
        to: 100,
      },
    );

    await new TiktokCommentsLoader(
      this.scrapingSupport,
      loadCommentsProgressMgr,
      commentsContainer,
      expectedCommentsCount,
    ).loadCommentsAndReplies();

    // Force position relative so that Element position works for createScreenshotProviderForScrollableDescendants
    commentsContainer.style.position = "relative";

    const screenshotProvider: ElementScreenshotProvider =
      await createScreenshotProviderForScrollableDescendants(
        commentsContainer,
        this.scrapingSupport,
        captureScreenshotsProgressMgr,
      );

    return await this.scrapCommentsContent(
      commentsContainer,
      scrapContentProgressMgr,
      screenshotProvider,
    );
  }

  private async openCommentsSideNavAndFindCommentsContainer(
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
      hasClassNameWithSuffix(b, "DivCommentMainWithoutScroll");
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

  private async findToggleCommentsButton(
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

  private async scrapExpectedCommentsCount(
    commentsContainer: HTMLElement,
  ): Promise<number> {
    const commentCountContainer =
      await this.scrapingSupport.waitForSelectorOrThrow(
        commentsContainer,
        "div",
        HTMLDivElement,
        {
          predicate: (e) =>
            hasClassNameWithSuffix(e, "DivCommentCountContainer"),
        },
      );

    const commentCountContainerText = commentCountContainer.innerText;

    const COMMENTS_COUNT_REGEX = /(\d+) commentaires/;
    const matchResult = commentCountContainerText.match(COMMENTS_COUNT_REGEX);

    if (!matchResult || matchResult.length !== 2) {
      throw new Error("Failed to extract expected comment counts");
    }
    return Number.parseInt(matchResult[1]);
  }

  private async scrapCommentsContent(
    commentsContainer: HTMLElement,
    progressMgr: ProgressManager,
    screenshotProvider: ElementScreenshotProvider,
  ): Promise<CommentSnapshot[]> {
    const commentThreadElements = this.scrapingSupport.selectAll(
      commentsContainer,
      "div",
      HTMLDivElement,
      {
        predicate: (e) => hasClassNameWithSuffix(e, "DivCommentObjectWrapper"),
      },
    );

    const commentThreads: CommentSnapshot[] = [];

    for (const commentThreadElement of commentThreadElements) {
      progressMgr.setProgress(
        (commentThreads.length / commentThreadElements.length) * 100,
      );
      const rootCommentElement = this.scrapingSupport.selectOrThrow(
        commentThreadElement,
        ":scope > div",
        HTMLDivElement,
        {
          predicate: (e) => hasClassNameWithSuffix(e, "DivCommentItemWrapper"),
        },
      );

      const rootComment = await new TiktokLoadedCommentScraper(
        rootCommentElement,
        screenshotProvider,
        this.scrapingSupport,
      ).scrapLoadedComment();

      const replies: CommentSnapshot[] = await this.scrapReplies(
        commentThreadElement,
        screenshotProvider,
      );
      commentThreads.push({ ...rootComment, replies: replies });
    }

    return commentThreads;
  }

  private async scrapReplies(
    threadElement: HTMLDivElement,
    screenshotProvider: ElementScreenshotProvider,
  ): Promise<CommentSnapshot[]> {
    const replyContainer = this.scrapingSupport.select(
      threadElement,
      ":scope > div",
      HTMLDivElement,
      {
        predicate: (e) => hasClassNameWithSuffix(e, "DivReplyContainer"),
      },
    );

    const replies: CommentSnapshot[] = [];
    if (replyContainer) {
      const replyElements = this.scrapingSupport.selectAll(
        replyContainer,
        ":scope > div",
        HTMLDivElement,
        {
          predicate: (e) => hasClassNameWithSuffix(e, "DivCommentItemWrapper"),
        },
      );

      for (const replyElement of replyElements) {
        const reply = await new TiktokLoadedCommentScraper(
          replyElement,
          screenshotProvider,
          this.scrapingSupport,
        ).scrapLoadedComment();
        replies.push({ ...reply, replies: [] });
      }
    }
    return replies;
  }
}
