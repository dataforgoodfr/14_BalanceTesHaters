import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forgetProcessUsage,
  readActivity,
  startProcessMonitoring,
} from "../SoakTestPageProbe";

describe("SoakTestPageProbe process usage", () => {
  afterEach(() => {
    forgetProcessUsage(42);
    vi.unstubAllGlobals();
  });

  it("includes the latest resource usage for all processes attached to a tab", async () => {
    let processListener:
      | ((
          processes: Record<
            number,
            {
              tasks: { tabId?: number }[];
              cpu?: number;
              jsMemoryUsed?: number;
              jsMemoryAllocated?: number;
            }
          >,
        ) => void)
      | undefined;
    const removeListener = vi.fn();
    vi.stubGlobal("chrome", {
      processes: {
        onUpdated: {
          addListener: vi.fn(
            (listener: NonNullable<typeof processListener>) => {
              processListener = listener;
            },
          ),
          removeListener,
        },
      },
    });
    vi.stubGlobal("browser", {
      scripting: {
        executeScript: vi.fn().mockRejectedValue(new Error("unavailable")),
      },
      tabs: {
        get: vi.fn().mockRejectedValue(new Error("unavailable")),
      },
    });

    const stop = startProcessMonitoring();
    expect(processListener).toBeDefined();
    processListener?.({
      10: {
        tasks: [{ tabId: 42 }, { tabId: 42 }],
        cpu: 12.5,
        jsMemoryUsed: 100,
        jsMemoryAllocated: 150,
      },
      11: {
        tasks: [{ tabId: 42 }],
        cpu: 20,
        jsMemoryUsed: 200,
        jsMemoryAllocated: 250,
      },
      12: {
        tasks: [{ tabId: 99 }],
        cpu: 50,
        jsMemoryUsed: 1_000,
        jsMemoryAllocated: 1_500,
      },
    });

    await expect(readActivity(42, "youtube")).resolves.toMatchObject({
      processUsage: {
        cpuPercent: 32.5,
        jsMemoryUsedBytes: 300,
        jsMemoryAllocatedBytes: 400,
      },
    });

    stop();
    expect(removeListener).toHaveBeenCalledWith(processListener);
  });
});
