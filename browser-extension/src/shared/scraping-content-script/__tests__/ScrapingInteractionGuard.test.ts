import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findScrapingGuardOverlayElement,
  ScrapingInteractionGuard,
} from "../ScrapingInteractionGuard";

describe("ScrapingInteractionGuard", () => {
  const initialWindow = globalThis.window;
  const initialDocument = globalThis.document;
  let currentOverlay: { remove: () => void } | undefined;

  beforeEach(() => {
    currentOverlay = undefined;
    const documentElement = {
      appendChild: vi.fn((element: { remove: () => void }) => {
        currentOverlay = element;
      }),
    };
    const createElement = vi.fn(() => {
      const style = {};
      const attributes = new Map<string, string>();
      return {
        style,
        setAttribute: (key: string, value: string) => {
          attributes.set(key, value);
        },
        remove: () => {
          currentOverlay = undefined;
        },
      };
    });
    const querySelector = vi.fn(() => currentOverlay);

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window & typeof globalThis;
    globalThis.document = {
      documentElement,
      createElement,
      querySelector,
    } as unknown as Document;
  });

  afterEach(() => {
    globalThis.window = initialWindow;
    globalThis.document = initialDocument;
  });

  it("activate should inject an overlay and deactivate should remove it", () => {
    const guard = new ScrapingInteractionGuard();

    expect(findScrapingGuardOverlayElement()).toBeUndefined();
    guard.activate();
    expect(findScrapingGuardOverlayElement()).toBeDefined();
    guard.deactivate();
    expect(findScrapingGuardOverlayElement()).toBeUndefined();
  });

  it("should block trusted user events", () => {
    const guard = new ScrapingInteractionGuard();
    guard.activate();
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      isTrusted: true,
      preventDefault,
      stopImmediatePropagation,
      stopPropagation,
    } as unknown as Event;

    // Accessing private method intentionally to isolate the event-filter logic.
    (
      guard as unknown as { onPotentiallyUserInput: (event: Event) => void }
    ).onPotentiallyUserInput(event);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("should not block synthetic events", () => {
    const guard = new ScrapingInteractionGuard();
    guard.activate();
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      isTrusted: false,
      preventDefault,
      stopImmediatePropagation,
      stopPropagation,
    } as unknown as Event;

    // Accessing private method intentionally to isolate the event-filter logic.
    (
      guard as unknown as { onPotentiallyUserInput: (event: Event) => void }
    ).onPotentiallyUserInput(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopImmediatePropagation).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it("should activate and deactivate beforeunload confirmation", () => {
    const guard = new ScrapingInteractionGuard();
    const activePreventDefault = vi.fn();

    const activeEvent = {
      preventDefault: activePreventDefault,
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    guard.activate();
    (
      guard as unknown as { onBeforeUnload: (event: BeforeUnloadEvent) => void }
    ).onBeforeUnload(activeEvent);
    expect(activePreventDefault).toHaveBeenCalledOnce();
    expect(activeEvent.returnValue).toBe(true);

    const inactivePreventDefault = vi.fn();
    const inactiveEvent = {
      preventDefault: inactivePreventDefault,
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;
    guard.deactivate();
    (
      guard as unknown as { onBeforeUnload: (event: BeforeUnloadEvent) => void }
    ).onBeforeUnload(inactiveEvent);
    expect(inactivePreventDefault).not.toHaveBeenCalled();
    expect(inactiveEvent.returnValue).toBeUndefined();
  });
});
