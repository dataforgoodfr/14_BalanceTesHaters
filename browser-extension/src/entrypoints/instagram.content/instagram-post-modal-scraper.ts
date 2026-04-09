import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { Author } from "@/shared/model/Author";
import { INSTAGRAM_URL, instagramPageInfo } from "./instagramPageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

const LOG_PREFIX = "[CS - InstagramPostModalScraper] ";

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

    // In modal layouts comments and metadata are usually inside the same article.
    const scrollableArea = modalRoot;

    return {
      channelHeader,
      scrollableArea,
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
    for (const selector of [
      ":scope span>div>span",
      ":scope h1",
      ":scope ul li h1",
    ]) {
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
    const selectors = [
      ":scope>div>div:nth-of-type(3)",
      ":scope>div>div:nth-of-type(2)",
      ":scope>div:nth-of-type(3)",
      ":scope>div:nth-of-type(2)",
      ":scope>div>ul",
      ":scope>ul",
    ];

    let selected: HTMLElement | undefined;
    let bestScore = -1;

    for (const selector of selectors) {
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

    if (selected && bestScore > 0) {
      return selected;
    }

    return scrollableArea;
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
    let previousMarkerCount = -1;
    let stagnantLoops = 0;

    for (let i = 0; i < 80; i += 1) {
      await this.scrapingSupport.resumeHostPage();

      const clicked = this.clickLoadMoreCommentsControls([
        commentsContainer,
        scrollableArea,
      ]);
      const scrolled =
        this.scrollToBottom(commentsContainer) ||
        this.scrollToBottom(scrollableArea);
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

      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  private selectLoadMoreCommentsButtons(container: HTMLElement): HTMLElement[] {
    const controls = this.scrapingSupport.selectAll(
      container,
      "button, a, span, div[role='button']",
      HTMLElement,
    );

    return controls.filter((element) => {
      const text = this.normalizeText(element.textContent)?.toLowerCase();
      if (!text) {
        return false;
      }

      return (
        text.includes("voir plus de commentaires") ||
        text.includes("voir tous les commentaires") ||
        text.includes("afficher plus de commentaires") ||
        text.includes("afficher tous les commentaires") ||
        text.includes("show more comments") ||
        text.includes("show all comments") ||
        text.includes("load more comments") ||
        text.includes("view more comments") ||
        text.includes("view all comments") ||
        text.includes("more comments") ||
        text.includes("plus de commentaires")
      );
    });
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
    const previousScrollTop = element.scrollTop;
    const previousWindowScrollY = window.scrollY;

    element.scrollTop = element.scrollHeight;
    element.scrollIntoView({ block: "end" });
    window.scrollBy(0, 300);

    return (
      element.scrollTop !== previousScrollTop ||
      window.scrollY !== previousWindowScrollY
    );
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

      const commentNode = this.resolveCommentNode(commentElement);
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

  private resolveCommentNode(commentElement: HTMLElement): HTMLElement {
    return commentElement.closest("li") ?? commentElement;
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
    for (const selector of [
      ":scope>div>div:nth-of-type(2)>span",
      ":scope span[dir='auto']",
      ":scope div[dir='auto'] span",
      ":scope h1",
      ":scope span",
    ]) {
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

    return [
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
    ].includes(normalizedText);
  }

  private countAllComments(comments: CommentSnapshot[]): number {
    let count = comments.length;
    for (const comment of comments) {
      count += this.countAllComments(comment.replies);
    }
    return count;
  }
}
