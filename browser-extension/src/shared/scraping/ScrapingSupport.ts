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
    options?: ElementPredicateOption<T>,
  ): T | undefined {
    const elements = this.selectAll(parent, selector, targetClass, options);
    if (elements.length > 0) {
      return elements[0];
    }
    return undefined;
  }

  selectAll<T extends Element>(
    parent: ParentNode,
    selector: string,
    targetClass: Class<T>,
    options?: ElementPredicateOption<T>,
  ): T[] {
    const elements = Array.from(parent.querySelectorAll(selector));
    const casted = elements.map((e) => this.castElement(e, targetClass));
    if (options?.predicate) {
      return casted.filter(options.predicate);
    } else {
      return casted;
    }
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
    options?: ElementPredicateOption<T> &
      SelectionElementsDescriptorsOptions &
      TimeoutOption,
  ): Promise<T> {
    const result = await this.waitForSelector(
      parent,
      selector,
      targetClass,
      options,
    );
    if (result.status === "failure") {
      console.error(
        result.message,
        // Log parent as object. This makes it interactable in browser console (can select in element panel...).
        "Parent:",
        parent,
      );
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
    options?: ElementPredicateOption<T> &
      SelectionElementsDescriptorsOptions &
      TimeoutOption,
  ): Promise<WaitForSelectorResult<T>> {
    const timeout = options?.timeout || 30000;

    const start = Date.now();
    while (Date.now() - start < timeout) {
      const elements = this.selectAll(parent, selector, targetClass, {
        predicate: options?.predicate,
      });
      if (elements.length > 0) {
        return {
          status: "success",
          element: elements[0],
        };
      }
      await this.sleep(100);
    }
    return {
      status: "failure",
      message: this.buildFailedToSelectErrorMessage(selector, {
        predicate: options?.predicate,
        selectedElementDescriptor: options?.selectedElementDescriptor,
        parentElementDescriptor: options?.parentElementDescriptor,
        timeout,
      }),
    };
  }

  async waitUntilNoVisibleElementMatches(
    parent: ParentNode,
    selector: string,
    options?: ElementPredicateOption<HTMLElement> &
      TimeoutOption & {
        /**
         * Callback function called after each wait increments.
         */
        onRemainingElements?: (
          remainingElements: HTMLElement[],
        ) => Promise<void>;
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
      visibleElements = options?.predicate
        ? visibleElements.filter(options?.predicate)
        : visibleElements;
      if (visibleElements.length === 0) {
        return;
      }

      if (Date.now() - start > timeout) {
        throw new Error(
          `Still ${visibleElements.length} elements matching selection at timeout.` +
            ` Selector:${selector}, Predicate ${String(options?.predicate)}, Timeout :(${timeout}ms)`,
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
    options?: ElementPredicateOption<T> & SelectionElementsDescriptorsOptions,
  ): T {
    const element = this.select(parent, selector, targetClass, options);
    if (!element) {
      const errorMessage = this.buildFailedToSelectErrorMessage<T>(selector, {
        predicate: options?.predicate,
        selectedElementDescriptor: options?.selectedElementDescriptor,
        parentElementDescriptor: options?.parentElementDescriptor,
      });
      console.error(
        errorMessage,
        // Log parent as object. This makes it interactable in browser console (can select in element panel...).
        "Parent:",
        parent,
      );
      throw new Error(errorMessage);
    }
    return element;
  }

  private buildFailedToSelectErrorMessage<T extends Element>(
    selector: string,
    options?: ElementPredicateOption<T> &
      SelectionElementsDescriptorsOptions &
      TimeoutOption,
  ) {
    const selectedDescriptor = options?.selectedElementDescriptor
      ? `${options?.selectedElementDescriptor} (selector: ${selector} and predicate: ${String(options?.predicate)})`
      : `element with selector: ${selector} and predicate: ${String(options?.predicate)}`;
    const parentDescriptor = options?.parentElementDescriptor
      ? `${options?.parentElementDescriptor}`
      : `parent`;

    const beforeTimeout = options?.timeout
      ? ` before timeout (${options?.timeout}ms)`
      : "";

    const errorMessage = `Failed to resolve ${selectedDescriptor} in ${parentDescriptor}${beforeTimeout}.`;
    return errorMessage;
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

  async click(element: HTMLElement) {
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );
    // Let the host page handle the click
    await this.resumeHostPage();
  }
}

export type SelectionElementsDescriptorsOptions = {
  // Used in error message to help with debug
  selectedElementDescriptor?: string;
  // Used in error message to help with debug
  parentElementDescriptor?: string;
};

export type ElementPredicateOption<T> = {
  // Extra predicate to apply to selector
  predicate?: (e: T) => boolean;
};

export type TimeoutOption = {
  timeout?: number;
};
