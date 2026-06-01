// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScrapingSupport } from "../ScrapingSupport";

function createScrapingSupport() {
  const abortController = new AbortController();
  return {
    abortController,
    scrapingSupport: new ScrapingSupport(abortController.signal),
  };
}

function createDiv(attributes?: Record<string, string>): HTMLDivElement {
  const el = document.createElement("div");
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      el.setAttribute(k, v);
    }
  }
  return el;
}

describe("ScrapingSupport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("throwIfAborted", () => {
    it("should not throw when not aborted", () => {
      const { scrapingSupport } = createScrapingSupport();
      expect(() => scrapingSupport.throwIfAborted()).not.toThrow();
    });

    it("should throw when aborted", () => {
      const { abortController, scrapingSupport } = createScrapingSupport();
      abortController.abort("ABORT");
      expect(() => scrapingSupport.throwIfAborted()).toThrow();
    });
  });

  describe("select", () => {
    it("should return first matching element", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child1 = createDiv({ class: "target" });
      const child2 = createDiv({ class: "target" });
      parent.append(child1, child2);

      const result = scrapingSupport.select(parent, ".target", HTMLDivElement);
      expect(result).toBe(child1);
    });

    it("should return undefined when no match", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      const result = scrapingSupport.select(
        parent,
        ".nonexistent",
        HTMLDivElement,
      );
      expect(result).toBeUndefined();
    });

    it("should apply predicate when provided", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child1 = createDiv({ class: "target", "data-active": "false" });
      const child2 = createDiv({ class: "target", "data-active": "true" });
      parent.append(child1, child2);

      const result = scrapingSupport.select(parent, ".target", HTMLDivElement, {
        predicate: (e) => e.dataset.active === "true",
      });
      expect(result).toBe(child2);
    });
  });

  describe("selectAll", () => {
    it("should return all matching elements", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child1 = createDiv({ class: "target" });
      const child2 = createDiv({ class: "target" });
      parent.append(child1, child2);

      const results = scrapingSupport.selectAll(
        parent,
        ".target",
        HTMLDivElement,
      );
      expect(results).toEqual([child1, child2]);
    });

    it("should return empty array when no matches", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      const results = scrapingSupport.selectAll(
        parent,
        ".nonexistent",
        HTMLDivElement,
      );
      expect(results).toEqual([]);
    });

    it("should filter by predicate", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child1 = createDiv({ class: "item", "data-value": "1" });
      const child2 = createDiv({ class: "item", "data-value": "2" });
      parent.append(child1, child2);

      const results = scrapingSupport.selectAll(
        parent,
        ".item",
        HTMLDivElement,
        { predicate: (e) => e.dataset.value === "2" },
      );
      expect(results).toEqual([child2]);
    });
  });

  describe("selectOrThrow", () => {
    it("should return element when found", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child = createDiv({ class: "found" });
      parent.append(child);

      const result = scrapingSupport.selectOrThrow(
        parent,
        ".found",
        HTMLDivElement,
      );
      expect(result).toBe(child);
    });

    it("should throw when element not found", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      expect(() =>
        scrapingSupport.selectOrThrow(parent, ".missing", HTMLDivElement),
      ).toThrow(
        "Failed to resolve element with selector: .missing and predicate: undefined in parent.",
      );
    });

    it("should include descriptors in error message", () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      expect(() =>
        scrapingSupport.selectOrThrow(parent, ".missing", HTMLDivElement, {
          selectedElementDescriptor: "target button",
          parentElementDescriptor: "the container",
        }),
      ).toThrow(
        "Failed to resolve target button (selector: .missing and predicate: undefined) in the container.",
      );
    });
  });

  describe("castElement", () => {
    it("should return element when type matches", () => {
      const { scrapingSupport } = createScrapingSupport();
      const el = document.createElement("div");
      expect(scrapingSupport["castElement"](el, HTMLDivElement)).toBe(el);
    });

    it("should throw when type does not match", () => {
      const { scrapingSupport } = createScrapingSupport();
      const el = document.createElement("a");
      expect(() => scrapingSupport["castElement"](el, HTMLDivElement)).toThrow(
        "Element is not of type HTMLDivElement",
      );
    });
  });
  describe("click", () => {
    it("should dispatch click event on element", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const el = document.createElement("button");
      const handler = vi.fn();
      el.addEventListener("click", handler);

      const promise = scrapingSupport.click(el);

      await vi.advanceTimersByTimeAsync(10);
      await promise;

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "click" }),
      );
    });
  });

  describe("waitForSelector", () => {
    it("should resolve immediately when element exists", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child = createDiv({ class: "present" });
      parent.append(child);

      const promise = scrapingSupport.waitForSelector(
        parent,
        ".present",
        HTMLDivElement,
        { timeout: 1000 },
      );

      const result = await promise;
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.element).toBe(child);
      }
    });

    it("should poll until element appears", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      const promise = scrapingSupport.waitForSelector(
        parent,
        ".appears",
        HTMLDivElement,
        { timeout: 5000 },
      );

      // Element added later, after 3 polling cycles
      setTimeout(() => {
        parent.append(createDiv({ class: "appears" }));
      }, 250);

      await vi.advanceTimersByTimeAsync(300);
      const result = await promise;
      expect(result.status).toBe("success");
    });

    it("should timeout when element never appears", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      const promise = scrapingSupport.waitForSelector(
        parent,
        ".never",
        HTMLDivElement,
        { timeout: 500 },
      );

      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;
      expect(result.status).toBe("failure");
      if (result.status === "failure") {
        expect(result.message).toContain(".never");
      }
    });

    it("should apply predicate while polling", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      const child1 = createDiv({ class: "item", "data-valid": "false" });
      const child2 = createDiv({ class: "item", "data-valid": "true" });
      parent.append(child1);

      const promise = scrapingSupport.waitForSelector(
        parent,
        ".item",
        HTMLDivElement,
        { predicate: (e) => e.dataset.valid === "true", timeout: 5000 },
      );

      // Add valid element later
      setTimeout(() => {
        parent.append(child2);
      }, 150);

      await vi.advanceTimersByTimeAsync(300);
      const result = await promise;
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.element).toBe(child2);
      }
    });

    it("should check abort signal during polling", async () => {
      const { abortController, scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      const promise = scrapingSupport.waitForSelector(
        parent,
        ".never",
        HTMLDivElement,
        { timeout: 5000 },
      );

      promise.catch(() => {});
      abortController.abort("ABORT");

      await vi.advanceTimersByTimeAsync(100);
      await expect(promise).rejects.toThrow();
    });
  });

  describe("waitForSelectorOrThrow", () => {
    it("should return element when found", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");
      parent.append(createDiv({ class: "found" }));

      const result = await scrapingSupport.waitForSelectorOrThrow(
        parent,
        ".found",
        HTMLDivElement,
        { timeout: 1000 },
      );
      expect(result).toBeInstanceOf(HTMLDivElement);
    });

    it("should throw on timeout", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const parent = document.createElement("div");

      const promise = scrapingSupport.waitForSelectorOrThrow(
        parent,
        ".missing",
        HTMLDivElement,
        { timeout: 500 },
      );
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(600);
      await expect(promise).rejects.toThrow(".missing");
    });
  });

  describe("sleep / resumeHostPage", () => {
    it("sleep should wait for duration", async () => {
      const { scrapingSupport } = createScrapingSupport();
      const before = Date.now();

      const promise = scrapingSupport.sleep(200);
      await vi.advanceTimersByTimeAsync(300);
      await promise;

      expect(Date.now() - before).toBeGreaterThanOrEqual(200);
    });

    it("sleep should throw if aborted during wait", async () => {
      const { abortController, scrapingSupport } = createScrapingSupport();

      const promise = scrapingSupport.sleep(5000);
      promise.catch(() => {});
      abortController.abort("ABORT");

      await vi.advanceTimersByTimeAsync(600);
      await expect(promise).rejects.toThrow();
    });

    it("resumeHostPage should resolve quickly", async () => {
      const { scrapingSupport } = createScrapingSupport();

      const promise = scrapingSupport.resumeHostPage();
      await vi.advanceTimersByTimeAsync(10);
      await promise;
    });
  });
});
