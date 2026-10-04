import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SOAK_TEST_CONTROLLER_URL,
  type SoakControllerConfig,
} from "../../src/shared/soak-test/SoakTestProtocol";
import { ExtensionControllerServer } from "../ExtensionControllerServer";

const config: SoakControllerConfig = {
  attempts: [
    {
      attemptId: "youtube-small-001",
      scenarioId: "youtube-small",
      platform: "youtube",
      url: "https://www.youtube.com/watch?v=example",
      repetition: 1,
      hardTimeoutMs: 60_000,
    },
  ],
  stallTimeoutMs: 30_000,
  pollIntervalMs: 1000,
  postSnapshotCleanup: "keep",
  scrapingSettings: {
    skipScreenshoting: false,
    skipSubmitForClassification: false,
  },
};

describe("ExtensionControllerServer", () => {
  it("rejects completion while an attempt is unfinished", async () => {
    const outputDirectory = await mkdtemp(
      path.join(tmpdir(), "bth-soak-server-"),
    );
    const controller = await ExtensionControllerServer.start({
      config,
      outputDirectory,
      onResult: () => Promise.resolve(),
      onProgress: () => Promise.resolve(),
    });
    const completionError = controller.completion.catch(
      (error: unknown) => error,
    );

    try {
      const extensionOrigin = `chrome-extension://${"a".repeat(32)}`;
      const configResponse = await fetch(`${SOAK_TEST_CONTROLLER_URL}/config`, {
        headers: { origin: extensionOrigin },
      });
      expect(configResponse.status).toBe(200);
      expect(configResponse.headers.get("access-control-allow-origin")).toBe(
        extensionOrigin,
      );

      await post("ready");
      await controller.ready;

      const pageResponse = await post("complete", "https://www.youtube.com");
      expect(pageResponse.status).toBe(403);

      const response = await post("complete");

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error:
          "Cannot complete the soak test while youtube-small-001 is waiting.",
      });
      await expect(completionError).resolves.toBeInstanceOf(Error);
    } finally {
      await controller.close();
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});

function post(action: string, origin?: string): Promise<Response> {
  return fetch(`${SOAK_TEST_CONTROLLER_URL}/${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: "{}",
  });
}
