// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { scrollToAndWait } from "../scrollToAndWait";

it.each([{ top: 10.1 }, { top: 9.5 }, { left: 10.5 }, { left: 9.9 }])(
  "skips a rounded no-op request without waiting for scrollend: %j",
  async (target) => {
    const element = document.createElement("div");
    const scrollTo = vi.fn();
    element.scrollTo = scrollTo;
    await scrollToAndWait(element, element, { top: 10, left: 10 }, target);
    expect(scrollTo).not.toHaveBeenCalled();
  },
);

it("waits for scrollend when either axis still needs to move", async () => {
  const element = document.createElement("div");
  element.scrollTo = () => {};
  const finished = vi.fn();
  const pending = scrollToAndWait(
    element,
    element,
    { top: 10, left: 10 },
    { top: 10.1, left: 11 },
  ).then(finished);
  await Promise.resolve();
  expect(finished).not.toHaveBeenCalled();
  element.dispatchEvent(new Event("scrollend"));
  await pending;
  expect(finished).toHaveBeenCalledOnce();
});

it("handles scrollend emitted while scrollTo is executing", async () => {
  const element = document.createElement("div");
  element.scrollTo = () => {
    element.dispatchEvent(new Event("scrollend"));
  };
  await scrollToAndWait(element, element, { top: 0, left: 0 }, { top: 20 });
});

it("cancels a pending scroll and removes its listener", async () => {
  const element = document.createElement("div");
  const controller = new AbortController();
  const reason = new Error("Cancelled");
  const removeListener = vi.spyOn(element, "removeEventListener");
  element.scrollTo = () => {};
  const outcome = scrollToAndWait(
    element,
    element,
    { top: 0, left: 0 },
    { top: 20, signal: controller.signal },
  ).catch((error: unknown) => error);
  controller.abort(reason);
  expect(await outcome).toBe(reason);
  expect(removeListener).toHaveBeenCalledWith(
    "scrollend",
    expect.any(Function),
  );
});

it("rejects before scrolling when already cancelled", async () => {
  const element = document.createElement("div");
  const controller = new AbortController();
  const reason = new Error("Cancelled");
  controller.abort(reason);
  const scrollTo = vi.fn();
  element.scrollTo = scrollTo;
  await expect(
    scrollToAndWait(
      element,
      element,
      { top: 0, left: 0 },
      { top: 20, signal: controller.signal },
    ),
  ).rejects.toBe(reason);
  expect(scrollTo).not.toHaveBeenCalled();
});

it("cleans up when scrollTo throws", async () => {
  const element = document.createElement("div");
  const reason = new Error("Scroll failed");
  const removeListener = vi.spyOn(element, "removeEventListener");
  element.scrollTo = () => {
    throw reason;
  };
  await expect(
    scrollToAndWait(element, element, { top: 0, left: 0 }, { top: 20 }),
  ).rejects.toBe(reason);
  expect(removeListener).toHaveBeenCalledWith(
    "scrollend",
    expect.any(Function),
  );
});

afterEach(() => vi.restoreAllMocks());
