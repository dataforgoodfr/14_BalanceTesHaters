const SCRAPING_GUARD_OVERLAY_DATA_ATTRIBUTE = "data-bth-scraping-guard";

type GuardedEventType =
  | "auxclick"
  | "click"
  | "contextmenu"
  | "dblclick"
  | "keydown"
  | "keypress"
  | "keyup"
  | "mousedown"
  | "mouseup"
  | "pointerdown"
  | "pointerup"
  | "touchend"
  | "touchmove"
  | "touchstart"
  | "wheel";

const GUARDED_EVENT_TYPES: GuardedEventType[] = [
  "auxclick",
  "click",
  "contextmenu",
  "dblclick",
  "keydown",
  "keypress",
  "keyup",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
  "touchend",
  "touchmove",
  "touchstart",
  "wheel",
];

const GUARDED_EVENT_LISTENER_OPTIONS: AddEventListenerOptions = {
  capture: true,
  passive: false,
};

/**
 * Prevent accidental user interaction with the host page during scraping.
 *
 * This blocks only trusted user-driven input events (event.isTrusted === true),
 * so scraper-triggered synthetic events continue to work.
 */
export class ScrapingInteractionGuard {
  private active = false;
  private overlayElement: HTMLDivElement | null = null;

  private onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!this.active) {
      return;
    }
    event.preventDefault();
    // Required for legacy browser support.
    event.returnValue = true;
  };

  private onPotentiallyUserInput = (event: Event) => {
    if (!this.active || !event.isTrusted) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
  };

  activate(): void {
    if (this.active) {
      return;
    }
    this.active = true;
    this.overlayElement = this.createOverlayElement();
    if (this.overlayElement) {
      document.documentElement?.appendChild(this.overlayElement);
    }

    for (const eventType of GUARDED_EVENT_TYPES) {
      window.addEventListener(
        eventType,
        this.onPotentiallyUserInput,
        GUARDED_EVENT_LISTENER_OPTIONS,
      );
    }
    window.addEventListener("beforeunload", this.onBeforeUnload);
  }

  deactivate(): void {
    if (!this.active) {
      return;
    }
    this.active = false;

    for (const eventType of GUARDED_EVENT_TYPES) {
      window.removeEventListener(
        eventType,
        this.onPotentiallyUserInput,
        GUARDED_EVENT_LISTENER_OPTIONS,
      );
    }
    window.removeEventListener("beforeunload", this.onBeforeUnload);

    this.overlayElement?.remove();
    this.overlayElement = null;
  }

  private createOverlayElement(): HTMLDivElement | null {
    if (!document?.createElement) {
      return null;
    }
    const overlay = document.createElement("div");
    overlay.setAttribute(SCRAPING_GUARD_OVERLAY_DATA_ATTRIBUTE, "true");
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      cursor: "progress",
      background: "transparent",
      pointerEvents: "auto",
      touchAction: "none",
      zIndex: "2147483647",
    });
    return overlay;
  }
}

export function findScrapingGuardOverlayElement(): HTMLDivElement | undefined {
  return document.querySelector(
    `[${SCRAPING_GUARD_OVERLAY_DATA_ATTRIBUTE}]`,
  ) as HTMLDivElement | undefined;
}
