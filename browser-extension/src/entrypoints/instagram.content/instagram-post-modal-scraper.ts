import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { Author } from "@/shared/model/Author";
import { INSTAGRAM_URL, instagramPageInfo } from "./instagramPageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

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
  "show more comments",
  "show all comments",
  "load more comments",
  "view more comments",
  "view all comments",
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
const UI_LABELS = new Set([
  "like",
  "likes",
  "liked",
  "j'aime",
  "j’aime",
  "reply",
  "replies",
  "répondre",
  "see translation",
  "voir la traduction",
  "follow",
  "following",
  "suivre",
  "ago",
]);

type InstagramPostElements = {
  channelHeader: HTMLElement;
  scrollableArea: HTMLElement;
};

export class InstagramPostModalScraper {
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
    const rawComments: CommentSnapshot[] = await this.scrapPostComments(
      postElements.scrollableArea,
    );
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
    const authorLink = this.scrapingSupport.select(
      modalRoot,
      "header a[href^='/'], a[href^='/']",
      HTMLAnchorElement,
    );

    const channelHeader =
      authorLink?.closest("header") ?? authorLink?.parentElement ?? modalRoot;

    return {
      channelHeader,
      // In modal layouts comments and metadata are usually inside the same article.
      scrollableArea: modalRoot,
    };
  }

  private selectModalRoot(): HTMLElement {
    const candidates = this.scrapingSupport.selectAll(
      document,
      '[role="dialog"] article, main article',
      HTMLElement,
    );
    for (const candidate of candidates) {
      if (
        this.scrapingSupport.select(
          candidate,
          "a[href^='/'], time[datetime]",
          HTMLElement,
        )
      ) {
        return candidate;
      }
    }

    throw new Error("Failed to resolve selector: instagram modal root");
  }

  private scrapPostAuthor(channelHeader: HTMLElement): Author {
    const channelElement = this.scrapingSupport.select(
      channelHeader,
      ":scope a[href^='/']",
      HTMLAnchorElement,
    );
    const channelElementHref = channelElement?.getAttribute("href");
    if (!channelElement || !channelElementHref) {
      throw new Error("Missing channel href");
    }

    const channelName = this.normalizeText(channelElement.textContent);
    if (!channelName) {
      throw new Error("Missing channel name");
    }

    return {
      name: channelName,
      accountHref: new URL(channelElementHref, INSTAGRAM_URL).toString(),
    };
  }

  private scrapPostTextContent(element: HTMLElement): string {
    for (const selector of POST_TEXT_SELECTORS) {
      const textElement = this.scrapingSupport.select(
        element,
        selector,
        HTMLElement,
      );
      const text = this.normalizeText(textElement?.textContent);
      if (text && !this.looksLikeUiLabel(text)) {
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
  ): Promise<CommentSnapshot[]> {
    const commentsContainer = this.selectCommentsContainer(scrollableArea);
    commentsContainer.scrollIntoView();

    await this.loadAllTopLevelComments(commentsContainer, scrollableArea);

    let comments =
      this.scrapCommentHierarchyFromDatetimeMarkers(commentsContainer);
    if (this.countAllComments(comments) <= 1) {
      const broaderComments =
        this.scrapCommentHierarchyFromDatetimeMarkers(scrollableArea);
      if (
        this.countAllComments(broaderComments) > this.countAllComments(comments)
      ) {
        comments = broaderComments;
      }
    }

    return comments;
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
    const interactionContainers: HTMLElement[] = [
      commentsContainer,
      scrollableArea,
    ];
    if (dialogRoot instanceof HTMLElement) {
      interactionContainers.push(dialogRoot);
    }

    let previousMarkerCount = -1;
    let stagnantLoops = 0;

    for (let i = 0; i < 80; i += 1) {
      await this.scrapingSupport.resumeHostPage();

      const clicked = this.clickLoadMoreCommentsControls(interactionContainers);
      const scrolled = interactionContainers
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

    if (element instanceof HTMLElement) {
      return element;
    }

    return element.parentElement ?? undefined;
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
        control.scrollIntoView();
        control.click();
        clicked = true;
      }
    }

    return clicked;
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
  ): CommentSnapshot[] {
    const records: Array<{
      node: HTMLElement;
      parentNode?: HTMLElement;
      comment: CommentSnapshot;
    }> = [];
    const seenNodes = new Set<HTMLElement>();
    const seenSignatures = new Set<string>();
    const times = this.scrapingSupport.selectAll(
      root,
      "time[datetime]",
      HTMLElement,
    );

    for (const timeElement of times) {
      const commentElement = this.findCommentElementFromTime(timeElement);
      if (!commentElement) {
        continue;
      }

      const commentNode = commentElement.closest("li") ?? commentElement;
      if (seenNodes.has(commentNode)) {
        continue;
      }

      const comment = this.scrapLooseCommentFromElement(commentElement);
      if (!comment) {
        continue;
      }

      const signature = [
        comment.author.accountHref,
        comment.publishedAt.type,
        comment.publishedAt.type === "absolute" ? comment.publishedAt.date : "",
        comment.textContent,
      ].join("|");
      if (seenSignatures.has(signature)) {
        continue;
      }
      seenNodes.add(commentNode);
      seenSignatures.add(signature);
      records.push({
        node: commentNode,
        parentNode: commentNode.parentElement?.closest("li") ?? undefined,
        comment,
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

    for (const record of records) {
      commentsByNode.set(record.node, record.comment);
      if (record.parentNode) {
        const parentComment = commentsByNode.get(record.parentNode);
        if (parentComment) {
          parentComment.replies.push(record.comment);
          continue;
        }
      }
      topLevelComments.push(record.comment);
    }

    return topLevelComments;
  }

  private findCommentElementFromTime(
    timeElement: HTMLElement,
  ): HTMLElement | undefined {
    let current: HTMLElement | null = timeElement;

    for (let depth = 0; depth < 10 && current; depth += 1) {
      if (
        this.scrapAuthorFromContainer(current) &&
        this.extractCommentText(current)
      ) {
        return current;
      }
      current = current.parentElement;
    }

    return undefined;
  }

  private scrapLooseCommentFromElement(
    commentElement: HTMLElement,
  ): CommentSnapshot | undefined {
    const author = this.scrapAuthorFromContainer(commentElement);
    const publishedAt = this.scrapPublishedAtFromContainer(commentElement);
    const text = this.extractCommentText(commentElement, author?.name);

    if (!author || !publishedAt || !text) {
      return undefined;
    }
    if (text === author.name || this.looksLikeUiLabel(text)) {
      return undefined;
    }

    return {
      id: crypto.randomUUID(),
      author,
      textContent: text,
      publishedAt,
      screenshotData: "",
      scrapedAt: currentIsoDate(),
      replies: [],
      nbLikes: 0, // See https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
    };
  }

  private extractCommentText(
    element: HTMLElement,
    authorName?: string,
  ): string | undefined {
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
    for (const textElement of textElements) {
      if (textElement.closest("a, button, time")) {
        continue;
      }

      const text = this.normalizeText(textElement.textContent);
      if (!text || this.looksLikeUiLabel(text)) {
        continue;
      }
      if (authorName && text === authorName) {
        continue;
      }
      if (!selectedText || text.length > selectedText.length) {
        selectedText = text;
      }
    }

    return selectedText;
  }

  private scrapAuthorFromContainer(element: HTMLElement): Author | undefined {
    const channelElement = this.scrapingSupport.select(
      element,
      "a[href^='/']",
      HTMLAnchorElement,
    );
    const channelElementHref = channelElement?.getAttribute("href");
    const channelName = this.normalizeText(channelElement?.textContent);
    if (!channelElement || !channelElementHref || !channelName) {
      return undefined;
    }

    return {
      name: channelName,
      accountHref: new URL(channelElementHref, INSTAGRAM_URL).toString(),
    };
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

  private normalizeText(text: string | null | undefined): string | undefined {
    const normalized = text?.trim();
    if (!normalized) {
      return undefined;
    }
    return normalized;
  }

  private looksLikeUiLabel(text: string): boolean {
    const normalizedText = text.toLowerCase();
    if (/^\d+[.,]?\d*[km]?$/i.test(normalizedText)) {
      return true;
    }

    return UI_LABELS.has(normalizedText);
  }

  private countAllComments(comments: CommentSnapshot[]): number {
    let count = comments.length;
    for (const comment of comments) {
      count += this.countAllComments(comment.replies);
    }
    return count;
  }
}
