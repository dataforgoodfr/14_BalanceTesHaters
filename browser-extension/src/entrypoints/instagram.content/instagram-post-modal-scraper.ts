import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { Author } from "@/shared/model/Author";
import { INSTAGRAM_URL, instagramPageInfo } from "./instagramPageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { captureInstagramCommentScreenshots } from "./instagram-comment-screenshot-capture";
import { PublicationDateTextParsing } from "@/shared/utils/date-text-parsing";
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
  "voir les commentaires",
  "afficher plus de commentaires",
  "afficher tous les commentaires",
  "afficher les commentaires",
  "charger d'autres commentaires",
  "voir les commentaires masques",
  "voir le commentaire masque",
  "afficher les commentaires masques",
  "afficher le commentaire masque",
  "voir ce commentaire",
  "voir ce message",
  "show more comments",
  "show all comments",
  "show comments",
  "load more comments",
  "view more comments",
  "view all comments",
  "view comments",
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
const NON_LOAD_MORE_CONTROL_TERMS = [
  "comment options",
  "options de commentaire",
  "like",
  "likes",
  "j'aime",
  "j’aime",
  "share",
  "partager",
  "send",
  "envoyer",
];
const RELATIVE_DATE_TEXT_REGEXES = [
  /^\d+\s*(?:s|sec|min|h|j|d|w|wk|sem|mo|m|y|yr|ans?|years?)\.?$/i,
  /^(?:il y a\s*)\d+\s*(?:secondes?|minutes?|heures?|jours?|semaines?|mois|ans?)$/i,
  /^\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago$/i,
  /^(?:now|maintenant|just now)$/i,
];
const UNKNOWN_COMMENT_DATE_TEXT = "date inconnue";
const COMMENT_TEXT_NOISE_TERMS = [
  "like",
  "likes",
  "reply",
  "replies",
  "j'aime",
  "j’aime",
  "repondre",
  "répondre",
  "verified",
  "modifie",
  "modifié",
  "edited",
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
    const postElements = this.selectPostElements(pageInfo.postId);

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
        pageInfo.postId,
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

  private selectPostElements(postId: string): InstagramPostElements {
    const modalRoot = this.selectModalRoot(postId);

    return {
      channelHeader: modalRoot,
      // In modal layouts comments and metadata are usually inside the same article.
      scrollableArea: modalRoot,
    };
  }

  private selectModalRoot(postId: string): HTMLElement {
    const visibleDialogs = this.scrapingSupport
      .selectAll(document, '[role="dialog"]', HTMLElement)
      .filter((dialog) => this.isVisible(dialog));
    if (visibleDialogs.length > 0) {
      const dialogScopedCandidates: HTMLElement[] = [];
      for (const dialog of visibleDialogs) {
        dialogScopedCandidates.push(dialog);
        for (const article of this.scrapingSupport.selectAll(
          dialog,
          "article",
          HTMLElement,
        )) {
          dialogScopedCandidates.push(article);
        }
      }
      const bestDialogCandidate = this.selectBestModalCandidate(
        dialogScopedCandidates,
        postId,
      );
      if (bestDialogCandidate) {
        return bestDialogCandidate;
      }
    }

    const fallbackCandidates: HTMLElement[] = this.scrapingSupport.selectAll(
      document,
      "main article",
      HTMLElement,
    );
    const bestFallbackCandidate = this.selectBestModalCandidate(
      fallbackCandidates,
      postId,
    );
    if (bestFallbackCandidate) {
      return bestFallbackCandidate;
    }
    throw new Error("Failed to resolve selector: instagram modal root");
  }

  private selectBestModalCandidate(
    candidates: HTMLElement[],
    postId: string,
  ): HTMLElement | undefined {
    let bestCandidate: HTMLElement | undefined;
    let bestCandidateScore = -1;
    for (const candidate of candidates) {
      const score = this.scoreModalRootCandidate(candidate, postId);
      if (score > bestCandidateScore) {
        bestCandidate = candidate;
        bestCandidateScore = score;
      }
    }

    if (!bestCandidate || bestCandidateScore <= 0) {
      return undefined;
    }
    return bestCandidate;
  }

  private isVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private scoreModalRootCandidate(
    candidate: HTMLElement,
    postId: string,
  ): number {
    let score = 0;
    if (candidate.closest("[role='dialog']")) {
      score += 500;
    }

    const postLinkCount = this.scrapingSupport
      .selectAll(candidate, "a[href]", HTMLAnchorElement)
      .filter((link) =>
        link.getAttribute("href")?.includes(`/${postId}`),
      ).length;
    score += Math.min(postLinkCount, 3) * 400;

    const accountLinkCount = this.scrapingSupport
      .selectAll(candidate, "a[href^='/']", HTMLAnchorElement)
      .filter((link) => {
        const href = link.getAttribute("href");
        if (!href) {
          return false;
        }
        return Boolean(this.extractInstagramAccountPathFromHref(href));
      }).length;
    score += Math.min(accountLinkCount, 8) * 30;

    const listItemCount = this.scrapingSupport.selectAll(
      candidate,
      "li",
      HTMLElement,
    ).length;
    score += Math.min(listItemCount, 12) * 20;

    const timeCount = this.scrapingSupport.selectAll(
      candidate,
      "time[datetime], time",
      HTMLElement,
    ).length;
    score += Math.min(timeCount, 8) * 15;

    const postTextCount = this.scrapingSupport.selectAll(
      candidate,
      "h1, h2",
      HTMLElement,
    ).length;
    score += Math.min(postTextCount, 4) * 10;

    const commentKeywordMatches = this.countCommentKeywordMatches(candidate);
    score += Math.min(commentKeywordMatches, 5) * 35;

    return score;
  }

  private countCommentKeywordMatches(candidate: HTMLElement): number {
    const controls = Array.from(
      candidate.querySelectorAll(LOAD_MORE_CONTROLS_SELECTOR),
    ).filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    let matches = 0;
    for (const control of controls) {
      const text = this.extractControlSearchText(control);
      if (!text) {
        continue;
      }
      if (this.isLoadMoreCommentsLabel(text)) {
        matches += 1;
      }
    }
    return matches;
  }

  private scrapPostAuthor(channelHeader: HTMLElement): Author {
    const links = this.scrapingSupport.selectAll(
      channelHeader,
      "a[href]",
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

    const channelName = normalizeInstagramText(selectedLink?.textContent);
    if (!selectedLink || !selectedAccountPath || !channelName) {
      const fallbackName = this.scrapPostAuthorNameFallback(channelHeader);
      if (fallbackName) {
        return {
          name: fallbackName,
          accountHref: document.URL,
        };
      }
      throw new Error("Missing channel href");
    }

    const resolvedChannelName = channelName ?? selectedAccountPath;
    if (!resolvedChannelName) {
      throw new Error("Missing channel name");
    }

    return {
      name: resolvedChannelName,
      accountHref: new URL(
        `/${selectedAccountPath}/`,
        INSTAGRAM_URL,
      ).toString(),
    };
  }

  private scrapPostAuthorNameFallback(
    channelHeader: HTMLElement,
  ): string | undefined {
    const fallbackSelectors = ["header a[href]", "h1", "h2", "a[role='link']"];
    for (const selector of fallbackSelectors) {
      const element = this.scrapingSupport.select(
        channelHeader,
        selector,
        HTMLElement,
      );
      const text = normalizeInstagramText(element?.textContent);
      if (text) {
        return text;
      }
    }
    return undefined;
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
    if (date) {
      return {
        type: "absolute",
        date,
      };
    }

    return {
      type: "unknown date",
      dateText:
        normalizeInstagramText(timeElement?.textContent) ??
        UNKNOWN_COMMENT_DATE_TEXT,
    };
  }

  private async scrapPostComments(
    scrollableArea: HTMLElement,
    progressManager: ProgressManager,
    postId: string,
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

    if (this.countAllComments(extraction.comments) === 0) {
      const listExtraction =
        this.scrapCommentHierarchyFromListItems(commentsContainer);
      if (
        this.countAllComments(listExtraction.comments) >
        this.countAllComments(extraction.comments)
      ) {
        extraction = listExtraction;
      }
    }

    if (this.countAllComments(extraction.comments) === 0) {
      const broaderListExtraction =
        this.scrapCommentHierarchyFromListItems(scrollableArea);
      if (
        this.countAllComments(broaderListExtraction.comments) >
        this.countAllComments(extraction.comments)
      ) {
        extraction = broaderListExtraction;
      }
    }

    if (this.countAllComments(extraction.comments) === 0) {
      const anchorExtraction =
        this.scrapCommentHierarchyFromAuthorAnchors(commentsContainer);
      if (
        this.countAllComments(anchorExtraction.comments) >
        this.countAllComments(extraction.comments)
      ) {
        extraction = anchorExtraction;
      }
    }

    if (this.countAllComments(extraction.comments) === 0) {
      const broaderAnchorExtraction =
        this.scrapCommentHierarchyFromAuthorAnchors(scrollableArea);
      if (
        this.countAllComments(broaderAnchorExtraction.comments) >
        this.countAllComments(extraction.comments)
      ) {
        extraction = broaderAnchorExtraction;
      }
    }

    if (this.countAllComments(extraction.comments) <= 1) {
      const permalinkExtraction = this.scrapCommentHierarchyFromPermalinkAnchors(
        document.body,
        postId,
      );
      if (
        this.countAllComments(permalinkExtraction.comments) >
        this.countAllComments(extraction.comments)
      ) {
        extraction = permalinkExtraction;
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
      "time[datetime], time",
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
        "time[datetime], time",
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

    let current: Element | null = element;
    for (let depth = 0; depth < 5 && current; depth += 1) {
      if (current instanceof HTMLElement) {
        return current;
      }
      current = current.parentElement;
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
    if (NON_LOAD_MORE_CONTROL_TERMS.some((term) => text.includes(term))) {
      return false;
    }

    const normalizedWithoutCounts = text
      .replace(/\d+[.,]?\d*\s*[km]?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (
      LOAD_MORE_COMMENTS_LABELS.some((label) =>
        normalizedWithoutCounts.includes(label),
      )
    ) {
      return true;
    }

    return /(?:\bvoir\b|\bafficher\b|\bshow\b|\bview\b|\bload\b).*\bcomment(?:aire|aires|s)?\b/i.test(
      normalizedWithoutCounts,
    );
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
      "time[datetime], time",
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

  private scrapCommentHierarchyFromListItems(
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
    const listItems = this.scrapingSupport.selectAll(root, "li", HTMLElement);

    for (const listItem of listItems) {
      const commentNode = listItem;
      if (seenNodes.has(commentNode)) {
        continue;
      }

      const scrapedComment = this.scrapLooseCommentFromElement(listItem);
      if (!scrapedComment) {
        continue;
      }

      const signature = [
        scrapedComment.comment.author.accountHref,
        scrapedComment.comment.publishedAt.type,
        scrapedComment.comment.publishedAt.type === "absolute"
          ? scrapedComment.comment.publishedAt.date
          : scrapedComment.comment.publishedAt.type === "unknown date"
            ? scrapedComment.comment.publishedAt.dateText
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

  private scrapCommentHierarchyFromAuthorAnchors(
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
    const accountAnchors = this.scrapingSupport
      .selectAll(root, "a[href^='/']", HTMLAnchorElement)
      .filter((anchor) => {
        const href = anchor.getAttribute("href");
        return Boolean(href && this.extractInstagramAccountPathFromHref(href));
      });

    for (const anchor of accountAnchors) {
      const candidateContainers = this.collectAnchorContainers(anchor);
      let selected: ScrapedLooseComment | undefined;
      let selectedNode: HTMLElement | undefined;
      for (const container of candidateContainers) {
        const scraped = this.scrapLooseCommentFromElement(container);
        if (!scraped) {
          continue;
        }
        selected = scraped;
        selectedNode = container.closest("li") ?? container;
        break;
      }

      if (!selected || !selectedNode || seenNodes.has(selectedNode)) {
        continue;
      }

      const signature = [
        selected.comment.author.accountHref,
        selected.comment.publishedAt.type,
        selected.comment.publishedAt.type === "absolute"
          ? selected.comment.publishedAt.date
          : selected.comment.publishedAt.type === "unknown date"
            ? selected.comment.publishedAt.dateText
            : "",
        selected.comment.textContent,
      ].join("|");
      if (seenSignatures.has(signature)) {
        continue;
      }

      seenNodes.add(selectedNode);
      seenSignatures.add(signature);
      records.push({
        node: selectedNode,
        parentNode: selectedNode.parentElement?.closest("li") ?? undefined,
        comment: selected.comment,
        screenshotElement: selected.screenshotElement,
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

  private scrapCommentHierarchyFromPermalinkAnchors(
    root: HTMLElement,
    postId: string,
  ): ScrapedComments {
    const records: Array<{
      node: HTMLElement;
      parentNode?: HTMLElement;
      comment: CommentSnapshot;
      screenshotElement: HTMLElement;
    }> = [];
    const seenNodes = new Set<HTMLElement>();
    const seenSignatures = new Set<string>();
    const permalinkAnchors = this.scrapingSupport
      .selectAll(root, "a[href*='/p/'][href*='/c/']", HTMLAnchorElement)
      .filter((anchor) =>
        Boolean(
          this.extractCommentIdFromPermalink(anchor.getAttribute("href"), postId),
        ),
      );

    for (const permalinkAnchor of permalinkAnchors) {
      const commentId = this.extractCommentIdFromPermalink(
        permalinkAnchor.getAttribute("href"),
        postId,
      );
      if (!commentId) {
        continue;
      }

      const commentContainer =
        this.findCommentContainerFromPermalinkAnchor(permalinkAnchor);
      const commentNode = commentContainer.closest("li") ?? commentContainer;
      if (seenNodes.has(commentNode)) {
        continue;
      }

      const scraped = this.scrapLooseCommentFromElement(commentContainer);
      const comment = scraped?.comment;
      const screenshotElement = scraped?.screenshotElement ?? commentContainer;
      if (!comment) {
        continue;
      }

      comment.commentId ??= commentId;

      const signature = [
        comment.commentId ?? "",
        comment.author.accountHref,
        comment.publishedAt.type,
        comment.publishedAt.type === "absolute"
          ? comment.publishedAt.date
          : comment.publishedAt.type === "unknown date"
            ? comment.publishedAt.dateText
            : "",
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
        screenshotElement,
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

  private extractCommentIdFromPermalink(
    href: string | null,
    postId: string,
  ): string | undefined {
    if (!href) {
      return undefined;
    }

    const parsedUrl = new URL(href, INSTAGRAM_URL);
    const match = parsedUrl.pathname.match(/^\/p\/([^/]+)\/c\/([^/]+)\/?$/);
    if (!match) {
      return undefined;
    }

    const [, shortcode, commentId] = match;
    if (shortcode !== postId || !commentId) {
      return undefined;
    }
    return commentId;
  }

  private findCommentContainerFromPermalinkAnchor(
    permalinkAnchor: HTMLAnchorElement,
  ): HTMLElement {
    let current: HTMLElement | null = permalinkAnchor;
    let bestCandidate: HTMLElement = permalinkAnchor;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let depth = 0; depth < 10 && current; depth += 1) {
      const score = this.scorePermalinkCommentContainerCandidate(current);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = current;
      }
      current = current.parentElement;
    }

    return bestCandidate;
  }

  private scorePermalinkCommentContainerCandidate(
    candidate: HTMLElement,
  ): number {
    const normalizedText = normalizeInstagramText(candidate.textContent) ?? "";
    const author = this.scrapAuthorFromContainer(candidate);
    const extractedText = this.extractCommentText(candidate, author?.name).text;
    const fallbackText = author
      ? this.extractFallbackCommentText(candidate, author.name)
      : undefined;
    const timeCount = this.scrapingSupport.selectAll(
      candidate,
      "time[datetime], time",
      HTMLElement,
    ).length;

    let score = 0;
    if (author) {
      score += 80;
    }
    if (extractedText) {
      score += 160;
    }
    if (fallbackText) {
      score += 70;
    }
    if (timeCount > 0) {
      score += 40;
    }
    if (
      /\b(?:like|likes|reply|replies|j['’]aime|repondre|répondre)\b/i.test(
        normalizedText,
      )
    ) {
      score += 30;
    }
    if (normalizedText.length > 900) {
      score -= 80;
    }
    if (this.scrapingSupport.select(candidate, "header, nav", HTMLElement)) {
      score -= 80;
    }
    return score;
  }

  private collectAnchorContainers(anchor: HTMLElement): HTMLElement[] {
    const containers: HTMLElement[] = [];
    let current: HTMLElement | null = anchor;

    for (let depth = 0; depth < 9 && current; depth += 1) {
      if (!containers.includes(current)) {
        containers.push(current);
      }
      current = current.parentElement;
    }

    return containers;
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
      "time[datetime], time",
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
    const publishedAt = this.scrapPublishedAtFromContainer(commentElement) ?? {
      type: "unknown date",
      dateText: UNKNOWN_COMMENT_DATE_TEXT,
    };
    const extractedText = this.extractCommentText(commentElement, author?.name);
    const text =
      extractedText.text ??
      (author
        ? this.extractFallbackCommentText(commentElement, author.name)
        : undefined);

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

  private extractFallbackCommentText(
    commentElement: HTMLElement,
    authorName: string,
  ): string | undefined {
    const normalizedText = normalizeInstagramText(commentElement.textContent);
    if (!normalizedText) {
      return undefined;
    }

    let candidate = normalizedText;
    const escapedAuthorName = this.escapeRegex(authorName);
    candidate = candidate.replace(
      new RegExp(`^${escapedAuthorName}\\b\\s*`, "i"),
      "",
    );

    for (const noiseTerm of COMMENT_TEXT_NOISE_TERMS) {
      candidate = candidate.replace(
        new RegExp(`\\b${this.escapeRegex(noiseTerm)}\\b`, "gi"),
        " ",
      );
    }
    candidate = candidate.replace(/\b\d+\s*(?:likes?|j['’]aime)\b/gi, " ");
    candidate = candidate.replace(/\s+/g, " ").trim();

    const sanitized = sanitizeInstagramCommentText(candidate);
    if (!sanitized || looksLikeInstagramUiLabel(sanitized)) {
      return undefined;
    }
    if (sanitized.length <= 1) {
      return undefined;
    }
    return sanitized;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    if (date) {
      return {
        type: "absolute",
        date,
      };
    }

    const dateText =
      this.findDateLikeText(element) ??
      normalizeInstagramText(timeElement?.textContent);
    if (!dateText) {
      return undefined;
    }

    return new PublicationDateTextParsing(dateText, new Date()).parse();
  }

  private findDateLikeText(element: HTMLElement): string | undefined {
    const candidates = this.scrapingSupport.selectAll(
      element,
      "time, a, span",
      HTMLElement,
    );

    for (const candidate of candidates) {
      const text = normalizeInstagramText(candidate.textContent);
      if (!text) {
        continue;
      }

      const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
      if (
        RELATIVE_DATE_TEXT_REGEXES.some((regex) => regex.test(normalized)) &&
        !looksLikeInstagramUiLabel(normalized)
      ) {
        return text;
      }
    }

    return undefined;
  }

  private countAllComments(comments: CommentSnapshot[]): number {
    let count = comments.length;
    for (const comment of comments) {
      count += this.countAllComments(comment.replies);
    }
    return count;
  }
}
