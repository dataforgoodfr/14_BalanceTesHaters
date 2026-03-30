import { sleep } from "../utils/sleep";

type Class<T> = new () => T;

type WaitForSelectorResult<T> =
  | {
      status: "failure";
      message: string;
    }
  | {
      status: "success";
      element: T;
    };

export class ScrapingSupport {
  constructor(private abortSignal: AbortSignal) {}

  /**
   * Check if aborted and throw if so.
   * Call this before starting an async operation.
   */
  throwIfAborted(): void {
    this.abortSignal.throwIfAborted();
  }

  select<T extends Element>(
    parent: ParentNode,
    selector: string,
    targetClass: Class<T>,
  ): T | undefined {
    const element = parent.querySelector(selector);
    if (!element) {
      return undefined;
    }
    return this.castElement(element, targetClass);
  }

  selectAll<T extends Element>(
    parent: ParentNode,
    selector: string,
    targetClass: Class<T>,
  ): T[] {
    const elements = Array.from(parent.querySelectorAll(selector));
    return elements.map((e) => this.castElement(e, targetClass));
  }

  /**
   * Wait for selector and throws if timeout is reached.
   * Checks abortSignal.throwIfAborted
   * @param parent
   * @param selector
   * @param targetClass
   * @param options
   * @returns
   */
  async waitForSelectorOrThrow<T extends Element>(
    parent: ParentNode,
    selector: string,
    targetClass: Class<T>,
    options?: {
      predicate?: (e: T) => boolean;
      timeout?: number;
    },
  ): Promise<T> {
    const result = await this.waitForSelector(
      parent,
      selector,
      targetClass,
      options,
    );
    if (result.status === "failure") {
      throw new Error(result.message);
    }
    return result.element;
  }

  /**
   * Wait for selector.
   * Checks abortSignal.throwIfAborted
   * @param parent
   * @param selector
   * @param targetClass
   * @param options
   * @returns
   */
  async waitForSelector<T extends Element>(
    parent: ParentNode,
    selector: string,
    targetClass: Class<T>,
    options?: {
      predicate?: (e: T) => boolean;
      timeout?: number;
    },
  ): Promise<WaitForSelectorResult<T>> {
    const timeout = options?.timeout || 30000;

    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = this.select(parent, selector, targetClass);
      if (element && (!options?.predicate || options?.predicate(element))) {
        return {
          status: "success",
          element: element,
        };
      }
      await this.sleep(100);
    }
    return {
      status: "failure",
      message:
        "Failed to select element matching selector " +
        selector +
        " and predicate " +
        String(options?.predicate) +
        " before timeout",
    };
  }

  async waitUntilNoVisibleElementMatches(
    parent: ParentNode,
    selector: string,
    options?: {
      extraPredicate?: (e: HTMLElement) => boolean;
      /**
       * Callback function called after each wait increments.
       */
      onRemainingElements: (remainingElements: HTMLElement[]) => Promise<void>;
      timeout?: number;
    },
  ): Promise<void> {
    const timeout = options?.timeout || 30000;

    const start = Date.now();
    for (;;) {
      let visibleElements = this.selectAll(
        parent,
        selector,
        HTMLElement,
      ).filter((e) => this.isVisible(e));
      visibleElements = options?.extraPredicate
        ? visibleElements.filter(options?.extraPredicate)
        : visibleElements;
      if (visibleElements.length === 0) {
        return;
      }

      if (Date.now() - start > timeout) {
        throw new Error(
          `Still ${visibleElements.length} elements matching selection at timeout.` +
            ` Selector:${selector}, Predicate ${String(options?.extraPredicate)}, Timeout :(${timeout}ms)`,
        );
      }

      if (options?.onRemainingElements) {
        await options?.onRemainingElements(visibleElements);
      }
      await this.sleep(200);
    }
  }

  selectOrThrow<T extends Element>(
    parent: ParentNode,
    selector: string,
    targetClass: Class<T>,
  ): T {
    const element = this.select(parent, selector, targetClass);
    if (!element) {
      console.error(
        "Failed to resolve selector: ",
        selector,
        "parent: ",
        parent,
      );
      throw new Error("Failed to resolve selector: " + selector);
    }
    return element;
  }

  isVisible(element: HTMLElement): boolean {
    return !this.hasEmptyBoundingBox(element);
  }

  hasEmptyBoundingBox(element: HTMLElement): boolean {
    const boundingRect = element.getBoundingClientRect();
    return boundingRect.height === 0 || boundingRect.width === 0;
  }

  castElement<T extends Element>(element: Element, targetClass: Class<T>): T {
    if (element instanceof targetClass) {
      return element;
    }
    throw new Error("Element is not of type " + targetClass.name);
  }

  /**
   * Wait a number of milliseconds.
   * Checks abortSignal.throwIfAborted at least onece every 500ms
   * @param milliseconds
   */
  async sleep(milliseconds: number) {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
      this.abortSignal.throwIfAborted();
      const remaining = Date.now() - start;
      // Sleep by chunk of 500ms max
      const nextSleepDuration = Math.min(remaining, 500);
      await sleep(nextSleepDuration);
    }
  }

  /**
   * Make a short async wait to let the host page resume it's computations.
   * Also checks abortSignal.throwIfAborted
   */
  async resumeHostPage() {
    await this.sleep(1);
  }
}
