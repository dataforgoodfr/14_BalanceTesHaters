import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { Author } from "@/shared/model/Author";
import { INSTAGRAM_URL, instagramPageInfo } from "./instagramPageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { captureInstagramCommentScreenshots } from "./instagram-comment-screenshot-capture";
import {
  isLikelyInstagramAccountPath,
  looksLikeInstagramUiLabel,
  normalizeInstagramText,
  sanitizeInstagramCommentText,
} from "./instagram-comment-text-utils";

const LOG_PREFIX = "[CS - InstagramPostModalScraper] ";
const POST_TEXT_SELECTORS = [
  ":scope span>div>span",
  ":scope h1",
  ":scope ul li h1",
];
const COMMENTS_CONTAINER_SELECTORS = [
  ":scope>div>div:nth-of-type(3)",
  ":scope>div>div:nth-of-type(2)",
  ":scope>div:nth-of-type(3)",
  ":scope>div:nth-of-type(2)",
  ":scope>div>ul",
  ":scope>ul",
];
const LOAD_MORE_CONTROLS_SELECTOR =
  "button, a, span, div[role='button'], [aria-label], [title], svg, title";
const LOAD_MORE_COMMENTS_LABELS = [
  "voir plus de commentaires",
  "voir tous les commentaires",
  "afficher plus de commentaires",
  "afficher tous les commentaires",
  "charger d'autres commentaires",
  "voir les commentaires masques",
  "voir le commentaire masque",
  "afficher les commentaires masques",
  "afficher le commentaire masque",
  "voir ce commentaire",
  "voir ce message",
  "show more comments",
  "show all comments",
  "load more comments",
  "view more comments",
  "view all comments",
  "view hidden comments",
  "see hidden comments",
  "show hidden comments",
  "show hidden comment",
  "show this comment",
  "see this comment",
  "more comments",
  "plus de commentaires",
];
const COMMENT_TEXT_SELECTORS = [
  ":scope>div>div:nth-of-type(2)>span",
  ":scope span[dir='auto']",
  ":scope div[dir='auto'] span",
  ":scope h1",
  ":scope span",
];
type InstagramPostElements = {
  channelHeader: HTMLElement;
  scrollableArea: HTMLElement;
};

type ScrapedComments = {
  comments: CommentSnapshot[];
  commentElementsById: Map<string, HTMLElement>;
};

type ScrapedLooseComment = {
  comment: CommentSnapshot;
  screenshotElement: HTMLElement;
};

export class InstagramPostModalScraper {
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
    const { comments: rawComments, commentElementsById } =
      await this.scrapPostComments(
        postElements.scrollableArea,
        progressManager.subTaskProgressManager({ from: 0, to: 70 }),
      );

    this.debug("Capturing comment screenshots...");
    await captureInstagramCommentScreenshots({
      comments: rawComments,
      commentElementsById,
      scrapingSupport: this.scrapingSupport,
      progressManager: progressManager.subTaskProgressManager({
        from: 70,
        to: 100,
      }),
      debug: this.debug.bind(this),
    });
    const comments = rawComments.filter(
      (comment) => !this.isPostMetadataEntry(comment, author, publishedAt),
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

  private selectPostElements(): InstagramPostElements {
    const modalRoot = this.selectModalRoot();

    return {
      channelHeader: modalRoot,
      // In modal layouts comments and metadata are usually inside the same article.
      scrollableArea: modalRoot,
    };
  }

  private selectModalRoot(): HTMLElement {
    const selectors = [
      '[role="dialog"] article',
      '[role="dialog"]',
      "main article",
    ];
    const candidates: HTMLElement[] = [];
    for (const selector of selectors) {
      for (const candidate of this.scrapingSupport.selectAll(
        document,
        selector,
        HTMLElement,
      )) {
        candidates.push(candidate);
      }
    }

    let firstWithDateTime: HTMLElement | undefined;
    for (const candidate of candidates) {
      const hasAuthorLink = this.scrapingSupport.select(
        candidate,
        "a[href^='/']",
        HTMLAnchorElement,
      );
      const hasDateTime = this.scrapingSupport.select(
        candidate,
        "time[datetime]",
        HTMLElement,
      );
      if (hasAuthorLink && hasDateTime) {
        return candidate;
      }

      if (!firstWithDateTime && hasDateTime) {
        firstWithDateTime = candidate;
      }
    }

    if (firstWithDateTime) {
      return firstWithDateTime;
    }
    throw new Error("Failed to resolve selector: instagram modal root");
  }

  private scrapPostAuthor(channelHeader: HTMLElement): Author {
    const links = this.scrapingSupport.selectAll(
      channelHeader,
      "a[href^='/']",
      HTMLAnchorElement,
    );

    let selectedLink: HTMLAnchorElement | undefined;
    let selectedAccountPath: string | undefined;
    for (const link of links) {
      const href = link.getAttribute("href");
      if (!href) {
        continue;
      }
      const accountPath = this.extractInstagramAccountPathFromHref(href);
      if (accountPath) {
        selectedLink = link;
        selectedAccountPath = accountPath;
        break;
      }
    }

    if (!selectedLink || !selectedAccountPath) {
      throw new Error("Missing channel href");
    }

    const channelName =
      normalizeInstagramText(selectedLink.textContent) ?? selectedAccountPath;
    if (!channelName) {
      throw new Error("Missing channel name");
    }

    return {
      name: channelName,
      accountHref: new URL(`/${selectedAccountPath}/`, INSTAGRAM_URL).toString(),
    };
  }

  private extractInstagramAccountPathFromHref(
    href: string,
  ): string | undefined {
    const accountUrl = new URL(href, INSTAGRAM_URL);
    const pathParts = accountUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length !== 1) {
      return undefined;
    }
    const [path] = pathParts;
    if (!isLikelyInstagramAccountPath(path)) {
      return undefined;
    }
    return path;
  }

  private scrapPostTextContent(element: HTMLElement): string {
    for (const selector of POST_TEXT_SELECTORS) {
      const textElement = this.scrapingSupport.select(
        element,
        selector,
        HTMLElement,
      );
      const text = normalizeInstagramText(textElement?.textContent);
      if (text && !looksLikeInstagramUiLabel(text)) {
        return text;
      }
    }

    return "";
  }

  private scrapPostPublishedAt(element: HTMLElement): PublicationDate {
    const timeElement = this.scrapingSupport.select(
      element,
      ":scope time[datetime], :scope time",
      HTMLElement,
    );
    const date = timeElement?.getAttribute("datetime");
    if (!date) {
      throw new Error("Missing publication datetime in modal");
    }

    return {
      type: "absolute",
      date,
    };
  }

  private async scrapPostComments(
    scrollableArea: HTMLElement,
    progressManager: ProgressManager,
  ): Promise<ScrapedComments> {
    const commentsContainer = this.selectCommentsContainer(scrollableArea);
    commentsContainer.scrollIntoView();
    progressManager.setProgress(5);

    await this.loadAllTopLevelComments(commentsContainer, scrollableArea);
    progressManager.setProgress(65);

    let extraction =
      this.scrapCommentHierarchyFromDatetimeMarkers(commentsContainer);
    if (this.countAllComments(extraction.comments) <= 1) {
      const broaderExtraction =
        this.scrapCommentHierarchyFromDatetimeMarkers(scrollableArea);
      if (
        this.countAllComments(broaderExtraction.comments) >
        this.countAllComments(extraction.comments)
      ) {
        extraction = broaderExtraction;
      }
    }
    progressManager.setProgress(100);

    return extraction;
  }

  private selectCommentsContainer(scrollableArea: HTMLElement): HTMLElement {
    let selected: HTMLElement | undefined;
    let bestScore = -1;

    for (const selector of COMMENTS_CONTAINER_SELECTORS) {
      const candidate = this.scrapingSupport.select(
        scrollableArea,
        selector,
        HTMLElement,
      );
      if (!candidate) {
        continue;
      }

      const score = this.scoreCommentsContainer(candidate);
      if (score > bestScore) {
        selected = candidate;
        bestScore = score;
      }
    }

    const rootScore = this.scoreCommentsContainer(scrollableArea);
    if (rootScore > bestScore) {
      return scrollableArea;
    }

    return selected && bestScore > 0 ? selected : scrollableArea;
  }

  private scoreCommentsContainer(element: HTMLElement): number {
    const markerCount = this.scrapingSupport.selectAll(
      element,
      "time[datetime]",
      HTMLElement,
    ).length;
    const listItemCount = this.scrapingSupport.selectAll(
      element,
      "li",
      HTMLElement,
    ).length;
    const hasSpinner = this.selectSpinner(element) ? 1 : 0;
    return markerCount * 4 + listItemCount * 2 + hasSpinner;
  }

  private async loadAllTopLevelComments(
    commentsContainer: HTMLElement,
    scrollableArea: HTMLElement,
  ): Promise<void> {
    const dialogRoot = scrollableArea.closest("[role='dialog']");
    const interactionContainers = new Set<HTMLElement>([
      commentsContainer,
      scrollableArea,
    ]);
    const scrollableCommentsContainer =
      this.selectScrollableCommentsContainer(commentsContainer);
    if (scrollableCommentsContainer) {
      interactionContainers.add(scrollableCommentsContainer);
    }
    if (dialogRoot instanceof HTMLElement) {
      interactionContainers.add(dialogRoot);
    }

    let previousMarkerCount = -1;
    let stagnantLoops = 0;

    for (let i = 0; i < 80; i += 1) {
      await this.scrapingSupport.resumeHostPage();

      const containers = Array.from(interactionContainers);
      const clicked = this.clickLoadMoreCommentsControls(containers);
      const scrolled = containers
        .map((container) => this.scrollToBottom(container))
        .some(Boolean);
      const hasSpinner = Boolean(this.selectSpinner(commentsContainer));
      const markerCount = this.scrapingSupport.selectAll(
        scrollableArea,
        "time[datetime]",
        HTMLElement,
      ).length;

      if (markerCount > previousMarkerCount) {
        previousMarkerCount = markerCount;
        stagnantLoops = 0;
      } else if (!clicked && !hasSpinner && !scrolled) {
        stagnantLoops += 1;
      }

      if (stagnantLoops >= 4) {
        return;
      }

      await this.scrapingSupport.sleep(350);
    }
  }

  private selectScrollableCommentsContainer(
    commentsContainer: HTMLElement,
  ): HTMLElement | undefined {
    const candidates = [
      commentsContainer,
      ...this.scrapingSupport.selectAll(
        commentsContainer,
        "div, ul, section",
        HTMLElement,
      ),
    ];

    const scrollables = candidates.filter(
      (element) => element.scrollHeight > element.clientHeight + 20,
    );
    if (scrollables.length === 0) {
      return undefined;
    }

    return scrollables.sort((a, b) => b.clientHeight - a.clientHeight)[0];
  }

  private selectLoadMoreCommentsButtons(container: HTMLElement): HTMLElement[] {
    const controls = Array.from(
      container.querySelectorAll(LOAD_MORE_CONTROLS_SELECTOR),
    );
    const clickTargets = new Set<HTMLElement>();

    for (const element of controls) {
      const text = this.extractControlSearchText(element);
      if (!text || !this.isLoadMoreCommentsLabel(text)) {
        continue;
      }
      const target = this.resolveClickableControl(element);
      if (target) {
        clickTargets.add(target);
      }
    }

    return Array.from(clickTargets);
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

  private isLoadMoreCommentsLabel(text: string): boolean {
    return LOAD_MORE_COMMENTS_LABELS.some((label) => text.includes(label));
  }

  private clickLoadMoreCommentsControls(containers: HTMLElement[]): boolean {
    const seen = new Set<HTMLElement>();
    let clicked = false;

    for (const container of containers) {
      for (const control of this.selectLoadMoreCommentsButtons(container)) {
        if (seen.has(control)) {
          continue;
        }
        seen.add(control);
        this.activateControl(control);
        clicked = true;
      }
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

  private scrollToBottom(element: HTMLElement): boolean {
    let didScroll = false;

    for (const target of this.collectScrollableTargets(element)) {
      const previousScrollTop = target.scrollTop;
      target.scrollTop = previousScrollTop + Math.max(target.clientHeight, 300);
      target.dispatchEvent(new Event("scroll", { bubbles: true }));
      if (target.scrollTop !== previousScrollTop) {
        didScroll = true;
      }
    }

    const previousWindowScrollY = window.scrollY;
    element.scrollIntoView({ block: "end" });
    window.scrollBy(0, 300);
    if (window.scrollY !== previousWindowScrollY) {
      didScroll = true;
    }

    return didScroll;
  }

  private collectScrollableTargets(root: HTMLElement): HTMLElement[] {
    const candidates = [
      root,
      ...this.scrapingSupport.selectAll(root, "div, ul, section", HTMLElement),
    ];
    const scrollable = candidates.filter(
      (element) => element.scrollHeight > element.clientHeight + 20,
    );

    scrollable.sort(
      (a, b) =>
        b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
    );

    return scrollable.slice(0, 6);
  }

  private selectSpinner(container: HTMLElement): HTMLElement | undefined {
    return this.scrapingSupport.select(
      container,
      ':scope [role="progressbar"]',
      HTMLElement,
    );
  }

  private scrapCommentHierarchyFromDatetimeMarkers(
    root: HTMLElement,
  ): ScrapedComments {
    const records: Array<{
      node: HTMLElement;
      parentNode?: HTMLElement;
      comment: CommentSnapshot;
      screenshotElement: HTMLElement;
    }> = [];
    const seenNodes = new Set<HTMLElement>();
    const seenSignatures = new Set<string>();
    const times = this.scrapingSupport.selectAll(
      root,
      "time[datetime]",
      HTMLElement,
    );

    for (const timeElement of times) {
      const listItem = timeElement.closest("li");
      const commentElement =
        listItem ?? this.findCommentElementFromTime(timeElement);
      if (!commentElement) {
        continue;
      }

      const commentNode = commentElement.closest("li") ?? commentElement;
      if (seenNodes.has(commentNode)) {
        continue;
      }

      const scrapedComment = this.scrapLooseCommentFromElement(commentElement);
      if (!scrapedComment) {
        continue;
      }

      const signature = [
        scrapedComment.comment.author.accountHref,
        scrapedComment.comment.publishedAt.type,
        scrapedComment.comment.publishedAt.type === "absolute"
          ? scrapedComment.comment.publishedAt.date
          : "",
        scrapedComment.comment.textContent,
      ].join("|");
      if (seenSignatures.has(signature)) {
        continue;
      }
      seenNodes.add(commentNode);
      seenSignatures.add(signature);
      records.push({
        node: commentNode,
        parentNode: commentNode.parentElement?.closest("li") ?? undefined,
        comment: scrapedComment.comment,
        screenshotElement: scrapedComment.screenshotElement,
      });
    }

    records.sort((a, b) => {
      if (a.node === b.node) {
        return 0;
      }
      const relation = a.node.compareDocumentPosition(b.node);
      if (relation & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return -1;
    });

    const topLevelComments: CommentSnapshot[] = [];
    const commentsByNode = new Map<HTMLElement, CommentSnapshot>();
    const commentElementsById = new Map<string, HTMLElement>();

    for (const record of records) {
      commentsByNode.set(record.node, record.comment);
      commentElementsById.set(record.comment.id, record.screenshotElement);
      if (record.parentNode) {
        const parentComment = commentsByNode.get(record.parentNode);
        if (parentComment) {
          parentComment.replies.push(record.comment);
          continue;
        }
      }
      topLevelComments.push(record.comment);
    }

    return {
      comments: topLevelComments,
      commentElementsById,
    };
  }

  private findCommentElementFromTime(
    timeElement: HTMLElement,
  ): HTMLElement | undefined {
    let current: HTMLElement | null = timeElement;

    for (let depth = 0; depth < 10 && current; depth += 1) {
      if (this.isLikelyCommentElement(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return undefined;
  }

  private isLikelyCommentElement(element: HTMLElement): boolean {
    const author = this.scrapAuthorFromContainer(element);
    const commentText = this.extractCommentText(element, author?.name).text;
    if (!author || !commentText) {
      return false;
    }

    const timeCount = this.scrapingSupport.selectAll(
      element,
      "time[datetime]",
      HTMLElement,
    ).length;
    if (timeCount > 3) {
      return false;
    }

    return !this.scrapingSupport.select(element, "header", HTMLElement);
  }

  private scrapLooseCommentFromElement(
    commentElement: HTMLElement,
  ): ScrapedLooseComment | undefined {
    const author = this.scrapAuthorFromContainer(commentElement);
    const publishedAt = this.scrapPublishedAtFromContainer(commentElement);
    const extractedText = this.extractCommentText(commentElement, author?.name);
    const text = extractedText.text;

    if (!author || !publishedAt || !text) {
      return undefined;
    }
    if (text === author.name || looksLikeInstagramUiLabel(text)) {
      return undefined;
    }

    const comment: CommentSnapshot = {
      id: crypto.randomUUID(),
      author,
      textContent: text,
      publishedAt,
      // Filled later during screenshot capture phase.
      screenshotData: "",
      scrapedAt: currentIsoDate(),
      replies: [],
      nbLikes: 0, // See https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
    };

    return {
      comment,
      screenshotElement: this.selectCommentScreenshotTarget(
        commentElement,
        extractedText.sourceElement,
      ),
    };
  }

  private extractCommentText(
    element: HTMLElement,
    authorName?: string,
  ): { text?: string; sourceElement?: HTMLElement } {
    const textElements = new Set<HTMLElement>();
    for (const selector of COMMENT_TEXT_SELECTORS) {
      for (const textElement of this.scrapingSupport.selectAll(
        element,
        selector,
        HTMLElement,
      )) {
        textElements.add(textElement);
      }
    }

    let selectedText: string | undefined;
    let selectedTextSourceElement: HTMLElement | undefined;
    for (const textElement of textElements) {
      for (const textSegment of this.extractReadableTextSegments(textElement)) {
        if (authorName && textSegment.text === authorName) {
          continue;
        }
        if (!selectedText || textSegment.text.length > selectedText.length) {
          selectedText = textSegment.text;
          selectedTextSourceElement = textSegment.sourceElement;
        }
      }
    }

    return {
      text: selectedText,
      sourceElement: selectedTextSourceElement,
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
      if (!text || looksLikeInstagramUiLabel(text)) {
        continue;
      }

      segments.push({
        text,
        sourceElement: parentElement,
      });
    }

    return segments;
  }

  private selectCommentScreenshotTarget(
    commentElement: HTMLElement,
    textSourceElement?: HTMLElement,
  ): HTMLElement {
    if (textSourceElement) {
      const screenshotContainer = textSourceElement.closest("li, article, div");
      if (
        screenshotContainer instanceof HTMLElement &&
        commentElement.contains(screenshotContainer)
      ) {
        return screenshotContainer;
      }
      return textSourceElement;
    }

    return commentElement.closest("li") ?? commentElement;
  }

  private scrapAuthorFromContainer(element: HTMLElement): Author | undefined {
    const channelElements = this.scrapingSupport.selectAll(
      element,
      "a[href^='/']",
      HTMLAnchorElement,
    );

    for (const channelElement of channelElements) {
      const channelElementHref = channelElement.getAttribute("href");
      const channelName = normalizeInstagramText(channelElement.textContent);
      if (!channelElementHref || !channelName) {
        continue;
      }

      const accountUrl = new URL(channelElementHref, INSTAGRAM_URL);
      const pathParts = accountUrl.pathname.split("/").filter(Boolean);
      if (
        pathParts.length === 1 &&
        isLikelyInstagramAccountPath(pathParts[0])
      ) {
        return {
          name: channelName,
          accountHref: accountUrl.toString(),
        };
      }
    }

    return undefined;
  }

  private scrapPublishedAtFromContainer(
    element: HTMLElement,
  ): PublicationDate | undefined {
    const timeElement = this.scrapingSupport.select(
      element,
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

  private countAllComments(comments: CommentSnapshot[]): number {
    let count = comments.length;
    for (const comment of comments) {
      count += this.countAllComments(comment.replies);
    }
    return count;
  }
}
