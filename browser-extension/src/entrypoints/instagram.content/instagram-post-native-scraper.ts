import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { Author } from "@/shared/model/Author";
import { INSTAGRAM_URL, instagramPageInfo } from "./instagramPageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { InstagramPostModalScraper } from "./instagram-post-modal-scraper";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { captureInstagramCommentScreenshots } from "./instagram-comment-screenshot-capture";
import {
  isLikelyInstagramAccountPath,
  normalizeInstagramText,
  sanitizeInstagramCommentText,
} from "./instagram-comment-text-utils";

const LOG_PREFIX = "[CS - InstagramPostNativeScraper] ";
const LOAD_HIDDEN_COMMENTS_CONTROLS_SELECTOR =
  "button, a, div[role='button'], [aria-label], [title], span, svg, title";
const LOAD_HIDDEN_COMMENTS_LABELS = [
  "voir les commentaires masques",
  "voir le commentaire masque",
  "afficher les commentaires masques",
  "afficher le commentaire masque",
  "voir ce commentaire",
  "voir ce message",
  "see hidden comments",
  "view hidden comments",
  "show hidden comments",
  "show hidden comment",
  "see this comment",
  "show this comment",
];

const REEL_COMMENT_CONTROL_SELECTOR =
  "button, a, div[role='button'], [aria-label], [title], span, svg, title";
const REEL_COMMENT_CONTROL_LABELS = [
  "commenter",
  "commentaire",
  "commentaires",
  "comment",
  "comments",
];
const NON_REEL_COMMENT_CONTROL_LABELS = [
  "options de commentaire",
  "comment options",
  "j'aime",
  "like",
  "likes",
  "partager",
  "share",
  "envoyer",
  "send",
];

type InstagramPostElements = {
  channelHeader: HTMLElement;
  scrollableArea: HTMLElement;
};

type ScrapedComments = {
  comments: CommentSnapshot[];
  commentElementsById: Map<string, HTMLElement>;
  usedDatetimeFallback: boolean;
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

  async scrapPost(progressManager: ProgressManager): Promise<PostSnapshot> {
    this.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const pageInfo = instagramPageInfo(url);
    if (!pageInfo.isScrapablePost) {
      throw new Error("Not on a scrapable page");
    }

    if (this.isReelUrl(url)) {
      this.debug("Reel URL detected, trying to open comments panel");
      const commentsPanelOpened = await this.openReelCommentsPanelIfNeeded();
      if (!commentsPanelOpened) {
        throw new Error("Could not open reel comments panel");
      }
      this.debug("Routing reel scraping to modal scraper");
      return new InstagramPostModalScraper(this.scrapingSupport).scrapPost(
        progressManager,
      );
    }

    if (this.isModalContext()) {
      this.debug("Modal context detected, routing to modal scraper");
      return new InstagramPostModalScraper(this.scrapingSupport).scrapPost(
        progressManager,
      );
    }

    const scrapedAt = currentIsoDate();
    const postElements = this.selectPostElements();

    this.debug("Scraping author...");
    const author = this.scrapPostAuthor(postElements.channelHeader);
    this.debug(`author.name: ${author.name}`);

    this.debug("Scraping textContent...");
    const textContent = this.scrapPostTextContent(postElements.scrollableArea);
    this.debug(`textContent: ${(textContent ?? "").replaceAll("\n", "")}`);

    this.debug("Scraping publishedAt...");
    const publishedAt = this.scrapPostPublishedAt(postElements.scrollableArea);
    this.debug(`publishedAt: ${JSON.stringify(publishedAt)}`);

    this.debug("Scraping comments...");
    const {
      comments: rawComments,
      commentElementsById,
      usedDatetimeFallback,
    } = await this.scrapPostComments(
      postElements.scrollableArea,
      progressManager.subTaskProgressManager({ from: 0, to: 70 }),
    );

    const comments = usedDatetimeFallback
      ? rawComments.filter(
          (comment) => !this.isPostMetadataEntry(comment, author, publishedAt),
        )
      : rawComments;

    this.debug("Capturing comment screenshots...");
    await captureInstagramCommentScreenshots({
      comments,
      commentElementsById,
      scrapingSupport: this.scrapingSupport,
      progressManager: progressManager.subTaskProgressManager({
        from: 70,
        to: 100,
      }),
      debug: this.debug.bind(this),
    });

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
      coverImageUrl: this.coverImageUrl(),
    };
  }

  private isReelUrl(url: string): boolean {
    const parsedUrl = URL.parse(url);
    if (!parsedUrl || parsedUrl.hostname !== INSTAGRAM_URL.hostname) {
      return false;
    }

    return /\/(?:[^/]+\/)?reels?\//.test(parsedUrl.pathname);
  }

  private async openReelCommentsPanelIfNeeded(): Promise<boolean> {
    if (this.isModalContext()) {
      return true;
    }

    const baselineCommentTimeCount = this.countLikelyCommentTimeMarkers();
    const commentControls = this.selectReelCommentControls();
    if (commentControls.length === 0) {
      this.debug("Could not find reel comment control");
      return false;
    }

    this.debug(
      `Found ${commentControls.length} reel comment control candidate(s)`,
    );
    for (const control of commentControls.slice(0, 4)) {
      const label = this.extractControlSearchText(control);
      this.debug("Trying reel comment control", label ?? "<no-label>");
      this.activateControl(control);
      await this.scrapingSupport.sleep(250);

      const waitResult = await this.scrapingSupport.waitForSelector(
        document,
        '[role="dialog"]',
        HTMLElement,
        {
          timeout: 2000,
        },
      );

      if (waitResult.status === "success") {
        this.debug("Reel comments panel opened in dialog");
        return true;
      }

      const currentCommentTimeCount = this.countLikelyCommentTimeMarkers();
      if (currentCommentTimeCount > baselineCommentTimeCount) {
        this.debug(
          "Reel comments panel likely opened in inline layout",
          `time markers ${baselineCommentTimeCount} -> ${currentCommentTimeCount}`,
        );
        return true;
      }
    }

    this.debug(
      "Reel comments panel not detected after trying all controls",
      `baseline time markers: ${baselineCommentTimeCount}`,
    );
    return false;
  }

  private selectReelCommentControls(): HTMLElement[] {
    const elements = Array.from(
      document.querySelectorAll(REEL_COMMENT_CONTROL_SELECTOR),
    );
    const controls = new Set<HTMLElement>();

    for (const element of elements) {
      const text = this.extractControlSearchText(element);
      if (!text) {
        continue;
      }
      if (
        NON_REEL_COMMENT_CONTROL_LABELS.some((label) => text.includes(label)) ||
        !REEL_COMMENT_CONTROL_LABELS.some((label) => text.includes(label))
      ) {
        continue;
      }
      const target = this.resolveClickableControl(element);
      if (target) {
        controls.add(target);
      }
    }

    return Array.from(controls);
  }

  private countLikelyCommentTimeMarkers(): number {
    return this.scrapingSupport.selectAll(
      document,
      "main li time[datetime], [role='dialog'] time[datetime]",
      HTMLElement,
    ).length;
  }

  private activateControl(control: HTMLElement): void {
    control.scrollIntoView({ block: "center", inline: "nearest" });
    control.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    control.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    control.click();
    control.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    control.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  private resolveClickableControl(element: Element): HTMLElement | undefined {
    const clickableAncestor = element.closest("button, a, div[role='button']");
    if (clickableAncestor instanceof HTMLElement) {
      return clickableAncestor;
    }

    if (
      element instanceof HTMLButtonElement ||
      element instanceof HTMLAnchorElement ||
      (element instanceof HTMLElement &&
        element.getAttribute("role") === "button")
    ) {
      return element;
    }

    return undefined;
  }

  private extractControlSearchText(element: Element): string | undefined {
    const values: Array<string | null | undefined> = [
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
    ];

    for (const labelledElement of Array.from(
      element.querySelectorAll("[aria-label], [title], title"),
    )) {
      values.push(
        labelledElement.textContent,
        labelledElement.getAttribute("aria-label"),
        labelledElement.getAttribute("title"),
      );
    }

    const combinedText = values
      .map((value) => this.normalizeSearchText(value))
      .filter((value): value is string => Boolean(value))
      .join(" ");

    return combinedText || undefined;
  }

  private normalizeSearchText(
    text: string | null | undefined,
  ): string | undefined {
    const normalized = text
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (!normalized) {
      return undefined;
    }

    return normalized;
  }

  private isPostMetadataEntry(
    comment: CommentSnapshot,
    postAuthor: Author,
    postPublishedAt: PublicationDate,
  ): boolean {
    if (
      postPublishedAt.type !== "absolute" ||
      comment.publishedAt.type !== "absolute"
    ) {
      return false;
    }
    return (
      comment.author.accountHref === postAuthor.accountHref &&
      comment.publishedAt.date === postPublishedAt.date
    );
  }

  private isModalContext(): boolean {
    for (const dialogElement of Array.from(
      document.querySelectorAll('[role="dialog"]'),
    )) {
      if (
        dialogElement instanceof HTMLElement &&
        this.scrapingSupport.select(
          dialogElement,
          "time[datetime]",
          HTMLElement,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private selectPostElements(): InstagramPostElements {
    const mainContainer = this.scrapingSupport.selectOrThrow(
      document,
      "main>div>div>div",
      HTMLElement,
    );

    const socialContainer = this.scrapingSupport.selectOrThrow(
      mainContainer,
      ":scope>div:nth-of-type(2)>div",
      HTMLElement,
    );

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

  private scrapPostTextContent(element: HTMLElement): string | undefined {
    const selectors = [":scope span>div>span", ":scope ul li h1"];

    for (const selector of selectors) {
      const textContentElement = this.scrapingSupport.select(
        element,
        selector,
        HTMLElement,
      );
      const text = normalizeInstagramText(textContentElement?.textContent);
      if (text) {
        return text;
      }
    }

    // Post text is optional in the model: if we cannot find it, do not fail
    // the whole scraping job.
    this.debug("Post text content not found with known selectors");
    return undefined;
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
    progressManager: ProgressManager,
  ): Promise<ScrapedComments> {
    const commentsContainer = this.selectCommentsContainer(element);
    commentsContainer.scrollIntoView();
    progressManager.setProgress(5);

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments(commentsContainer);
    progressManager.setProgress(50);

    this.debug("Expanding all replies...");
    await this.loadAllReplies(commentsContainer);
    progressManager.setProgress(75);

    const commentElementsById = new Map<string, HTMLElement>();
    let comments = this.scrapCommentThreads(
      commentsContainer,
      commentElementsById,
    );
    let usedDatetimeFallback = false;
    if (comments.length === 0) {
      this.debug(
        "No comments parsed with native thread selectors, retrying with datetime-marker fallback",
      );
      comments = this.scrapCommentsFromDatetimeMarkers(
        element,
        commentElementsById,
      );
      usedDatetimeFallback = true;
    }
    this.debug("Comments metadata:", comments);
    progressManager.setProgress(100);

    return { comments, commentElementsById, usedDatetimeFallback };
  }

  private selectCommentsContainer(element: HTMLElement): HTMLElement {
    const selectors = [
      ":scope>div>div:nth-of-type(3)",
      ":scope>div>div:nth-of-type(2)",
    ];

    for (const selector of selectors) {
      const commentsContainer = this.scrapingSupport.select(
        element,
        selector,
        HTMLElement,
      );
      if (
        commentsContainer &&
        this.looksLikeCommentsContainer(commentsContainer)
      ) {
        return commentsContainer;
      }
    }

    throw new Error("Failed to resolve selector: " + selectors.join(" or "));
  }

  private looksLikeCommentsContainer(element: HTMLElement): boolean {
    const hasCommentThread = this.scrapingSupport.select(
      element,
      ":scope>div>div",
      HTMLElement,
    );
    if (hasCommentThread) {
      return true;
    }

    // On small posts or just after load, container can be present with spinner only.
    const hasProgressBar = this.scrapingSupport.select(
      element,
      ':scope [role="progressbar"]',
      HTMLElement,
    );
    return Boolean(hasProgressBar);
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

    // In some Instagram layouts, additional hidden comments are behind an
    // explicit "see hidden comments" button and no spinner is shown.
    for (let i = 0; i < 40; i += 1) {
      await this.scrapingSupport.resumeHostPage();
      const clicked = this.clickLoadHiddenCommentsControls(commentsContainer);
      if (!clicked) {
        return;
      }
      commentsContainer.scrollIntoView({ block: "end" });
      await this.scrapingSupport.sleep(250);
    }
  }

  private clickLoadHiddenCommentsControls(container: HTMLElement): boolean {
    const controls = Array.from(
      container.querySelectorAll(LOAD_HIDDEN_COMMENTS_CONTROLS_SELECTOR),
    );
    const seen = new Set<HTMLElement>();
    let clicked = false;

    for (const element of controls) {
      const text = this.extractControlSearchText(element);
      if (!text || !this.isLoadHiddenCommentsLabel(text)) {
        continue;
      }
      const target = this.resolveClickableControl(element);
      if (!target || seen.has(target)) {
        continue;
      }
      seen.add(target);
      this.activateControl(target);
      clicked = true;
    }

    return clicked;
  }

  private activateControl(control: HTMLElement): void {
    control.scrollIntoView({ block: "center", inline: "nearest" });
    control.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    control.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    control.click();
    control.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    control.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  private resolveClickableControl(element: Element): HTMLElement | undefined {
    const clickableAncestor = element.closest("button, a, div[role='button']");
    if (clickableAncestor instanceof HTMLElement) {
      return clickableAncestor;
    }

    if (
      element instanceof HTMLButtonElement ||
      element instanceof HTMLAnchorElement ||
      (element instanceof HTMLElement &&
        element.getAttribute("role") === "button")
    ) {
      return element;
    }

    return undefined;
  }

  private extractControlSearchText(element: Element): string | undefined {
    const values: Array<string | null | undefined> = [
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
    ];

    for (const labelledElement of Array.from(
      element.querySelectorAll("[aria-label], [title], title"),
    )) {
      values.push(
        labelledElement.textContent,
        labelledElement.getAttribute("aria-label"),
        labelledElement.getAttribute("title"),
      );
    }

    const combinedText = values
      .map((value) => this.normalizeSearchText(value))
      .filter((value): value is string => Boolean(value))
      .join(" ");
    return combinedText || undefined;
  }

  private normalizeSearchText(
    text: string | null | undefined,
  ): string | undefined {
    const normalized = text
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return undefined;
    }
    return normalized;
  }

  private isLoadHiddenCommentsLabel(text: string): boolean {
    return LOAD_HIDDEN_COMMENTS_LABELS.some((label) => text.includes(label));
  }

  private async loadAllReplies(commentsContainer: HTMLElement) {
    const repliesThreadElements = this.scrapingSupport.selectAll(
      commentsContainer,
      ":scope>div>div:nth-of-type(2)",
      HTMLElement,
    );

    const expandableReplyThreads: HTMLElement[] = [];
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
      expandableReplyThreads.push(replyThreadElement);
    }

    await Promise.all(
      expandableReplyThreads.map((replyThreadElement) =>
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
    commentElementsById: Map<string, HTMLElement>,
  ): CommentSnapshot[] {
    const commentThreads: CommentThread[] = [];
    const commentThreadContainers = this.scrapingSupport.selectAll(
      commentsContainer,
      ":scope>div",
      HTMLElement,
    );

    for (const commentThread of commentThreadContainers) {
      commentThreads.push(
        this.scrapCommentThread(commentThread, commentElementsById),
      );
    }

    return commentThreads
      .filter((thread) => thread.scrapingStatus === "success")
      .map((thread) => thread.comment);
  }

  private scrapCommentThread(
    commentElement: HTMLElement,
    commentElementsById: Map<string, HTMLElement>,
  ): CommentThread {
    const commentThreadContentElement = this.scrapingSupport.selectOrThrow(
      commentElement,
      ":scope>div",
      HTMLElement,
    );

    const commentThread = this.scrapCommentThreadContent(
      commentThreadContentElement,
      commentElementsById,
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
      commentThread.comment.replies = this.scrapCommentReplies(
        repliesContainer,
        commentElementsById,
      );
    }

    return commentThread;
  }

  private scrapCommentReplies(
    repliesContainer: HTMLElement,
    commentElementsById: Map<string, HTMLElement>,
  ): CommentSnapshot[] {
    const replies: CommentThread[] = [];
    const repliesElements = this.scrapingSupport.selectAll(
      repliesContainer,
      ":scope>div",
      HTMLElement,
    );

    for (const reply of repliesElements) {
      replies.push(this.scrapCommentThreadContent(reply, commentElementsById));
    }

    return replies
      .filter((thread) => thread.scrapingStatus === "success")
      .map((thread) => thread.comment);
  }

  private scrapCommentThreadContent(
    commentThreadContentElement: HTMLElement,
    commentElementsById: Map<string, HTMLElement>,
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

    const author = this.scrapCommentAuthor(baseElement);
    if (!author) {
      return {
        scrapingStatus: "failure",
        message: "Missing comment author",
      };
    }

    const publishedAt = this.scrapCommentPublishedAt(baseElement);
    if (!publishedAt) {
      return {
        scrapingStatus: "failure",
        message: "Missing comment date",
      };
    }

    const extractedText = this.extractCommentText(baseElement, author.name);
    if (!extractedText.text) {
      return {
        scrapingStatus: "failure",
        message: "Scraping comments without text is not supported yet",
      };
    }

    const comment = this.buildComment(author, publishedAt, extractedText.text);
    const screenshotTarget =
      extractedText.sourceElement?.parentElement ?? extractedText.sourceElement;
    commentElementsById.set(comment.id, screenshotTarget ?? baseElement);

    return {
      scrapingStatus: "success",
      comment,
    };
  }

  private scrapCommentsFromDatetimeMarkers(
    root: HTMLElement,
    commentElementsById: Map<string, HTMLElement>,
  ): CommentSnapshot[] {
    const comments: CommentSnapshot[] = [];
    const seenNode = new Set<HTMLElement>();
    const seenSignature = new Set<string>();
    const timeElements = this.scrapingSupport.selectAll(
      root,
      "time[datetime]",
      HTMLElement,
    );

    for (const timeElement of timeElements) {
      const closestListItem = timeElement.closest("li");
      const commentElement =
        (closestListItem instanceof HTMLElement
          ? closestListItem
          : undefined) ??
        this.findCommentElementFromTime(timeElement) ??
        timeElement.parentElement;
      if (!commentElement || seenNode.has(commentElement)) {
        continue;
      }

      const author = this.scrapCommentAuthor(commentElement);
      const publishedAt = this.scrapCommentPublishedAt(commentElement);
      const extractedText = this.extractCommentText(
        commentElement,
        author?.name,
      );
      if (
        !author ||
        !publishedAt ||
        publishedAt.type !== "absolute" ||
        !extractedText.text
      ) {
        continue;
      }

      const signature = [
        author.accountHref,
        publishedAt.date,
        extractedText.text,
      ].join("|");
      if (seenSignature.has(signature)) {
        continue;
      }
      seenNode.add(commentElement);
      seenSignature.add(signature);

      const comment = this.buildComment(
        author,
        publishedAt,
        extractedText.text,
      );
      const closestScreenshotContainer =
        extractedText.sourceElement?.closest("li, article, div") ?? undefined;
      const screenshotTarget =
        (closestScreenshotContainer instanceof HTMLElement
          ? closestScreenshotContainer
          : undefined) ??
        extractedText.sourceElement ??
        commentElement;
      commentElementsById.set(comment.id, screenshotTarget);
      comments.push(comment);
    }

    return comments;
  }

  private findCommentElementFromTime(
    timeElement: HTMLElement,
  ): HTMLElement | undefined {
    let current: HTMLElement | null = timeElement;

    for (let depth = 0; depth < 8 && current; depth += 1) {
      if (this.isLikelyCommentElement(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return undefined;
  }

  private isLikelyCommentElement(element: HTMLElement): boolean {
    const author = this.scrapCommentAuthor(element);
    const publishedAt = this.scrapCommentPublishedAt(element);
    const text = this.extractCommentText(element, author?.name).text;
    if (!author || !publishedAt || publishedAt.type !== "absolute" || !text) {
      return false;
    }

    const timeCount = this.scrapingSupport.selectAll(
      element,
      "time[datetime]",
      HTMLElement,
    ).length;
    return timeCount <= 4;
  }

  private buildComment(
    author: Author,
    publishedAt: PublicationDate,
    textContent: string,
  ): CommentSnapshot {
    return {
      id: crypto.randomUUID(),
      author,
      textContent,
      publishedAt,
      // Filled later during screenshot capture phase.
      screenshotData: "",
      scrapedAt: currentIsoDate(),
      replies: [],
      nbLikes: 0, // See https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
    };
  }

  private scrapCommentAuthor(baseElement: HTMLElement): Author | undefined {
    const linkCandidates = this.scrapingSupport.selectAll(
      baseElement,
      "a[href^='/']",
      HTMLAnchorElement,
    );

    for (const candidate of linkCandidates) {
      const href = candidate.getAttribute("href");
      const name = normalizeInstagramText(candidate.textContent);
      if (!href || !name) {
        continue;
      }

      const accountUrl = new URL(href, INSTAGRAM_URL);
      const pathParts = accountUrl.pathname.split("/").filter(Boolean);
      if (
        pathParts.length === 1 &&
        isLikelyInstagramAccountPath(pathParts[0])
      ) {
        return {
          name,
          accountHref: accountUrl.toString(),
        };
      }
    }

    return undefined;
  }

  private scrapCommentPublishedAt(
    baseElement: HTMLElement,
  ): PublicationDate | undefined {
    const timeElement = this.scrapingSupport.select(
      baseElement,
      "time[datetime], time",
      HTMLElement,
    );
    const date = timeElement?.getAttribute("datetime");
    if (!date) {
      return undefined;
    }
    return {
      type: "absolute",
      date,
    };
  }

  private extractCommentText(
    baseElement: HTMLElement,
    authorName?: string,
  ): { text?: string; sourceElement?: HTMLElement } {
    const textCandidates = this.scrapingSupport.selectAll(
      baseElement,
      ":scope>div>div:nth-of-type(2)>span, :scope span[dir='auto'], :scope div[dir='auto'] span",
      HTMLElement,
    );
    let bestText: string | undefined;
    let bestSource: HTMLElement | undefined;

    for (const candidate of textCandidates) {
      for (const textSegment of this.extractReadableTextSegments(candidate)) {
        if (authorName && textSegment.text === authorName) {
          continue;
        }
        if (!bestText || textSegment.text.length > bestText.length) {
          bestText = textSegment.text;
          bestSource = textSegment.sourceElement;
        }
      }
    }

    return {
      text: bestText,
      sourceElement: bestSource,
    };
  }

  private extractReadableTextSegments(
    element: HTMLElement,
  ): Array<{ text: string; sourceElement: HTMLElement }> {
    const segments: Array<{ text: string; sourceElement: HTMLElement }> = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parentElement = node.parentElement;
      if (!parentElement) {
        continue;
      }
      if (
        parentElement.closest(
          "a, button, time, title, svg, [role='button'], [aria-label]",
        )
      ) {
        continue;
      }

      const text = sanitizeInstagramCommentText(node.textContent);
      if (!text) {
        continue;
      }

      segments.push({
        text,
        sourceElement: parentElement,
      });
    }

    return segments;
  }

  private coverImageUrl() {
    const element = this.scrapingSupport.select(
      document,
      "meta[property='og:image']",
      HTMLElement,
    );
    return element?.getAttribute("content") ?? undefined;
  }
}
