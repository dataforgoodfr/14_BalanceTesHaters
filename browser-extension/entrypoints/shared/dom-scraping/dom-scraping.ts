import { sleep } from "../utils/sleep";

type Class<T> = new () => T;

export function select<T extends Element>(
  parent: ParentNode,
  selector: string,
  targetClass: Class<T>,
): T | undefined {
  const element = parent.querySelector(selector);
  if (!element) {
    return undefined;
  }
  return castElement(element, targetClass);
}

export function selectAll<T extends Element>(
  parent: ParentNode,
  selector: string,
  targetClass: Class<T>,
): T[] {
  const elements = Array.from(parent.querySelectorAll(selector));
  return elements.map((e) => castElement(e, targetClass));
}

export async function waitForSelector<T extends Element>(
  parent: ParentNode,
  selector: string,
  targetClass: Class<T>,
  options?: {
    predicate?: (e: T) => boolean;
    timeout?: number;
  },
): Promise<T> {
  const timeout = options?.timeout || 30000;

  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = select(parent, selector, targetClass);
    if (element && (!options?.predicate || options?.predicate(element))) {
      return element;
    }
    await sleep(100);
  }
  throw new Error(
    "Failed to select element matching selector " +
      selector +
      " and predicate " +
      options?.predicate +
      " before timeout",
  );
}

export function selectOrThrow<T extends Element>(
  parent: ParentNode,
  selector: string,
  targetClass: Class<T>,
): T {
  const element = select(parent, selector, targetClass);
  if (!element) {
    console.error("Failed to resolve selector: ", selector, "parent: ", parent);
    throw new Error("Failed to resolve selector: " + selector);
  }
  return element;
}

export function isVisible(element: HTMLElement): boolean {
  return !hasEmptyBoundingBox(element);
}

export function hasEmptyBoundingBox(element: HTMLElement): boolean {
  const boundingRect = element.getBoundingClientRect();
  return boundingRect.height === 0 || boundingRect.width === 0;
}

export function castElement<T extends Element>(
  element: Element,
  targetClass: Class<T>,
): T {
  if (element instanceof targetClass) {
    return element;
  }
  throw new Error("Element is not of type " + targetClass.name);
}

/** Let the JS queue suspend current task to dequeue UI javascript */
export async function resumeHostPage() {
  await sleep(1);
}
