import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  SoakControllerConfig,
  SoakControllerResult,
} from "../src/shared/soak-test/SoakTestProtocol";
import {
  SOAK_TEST_CONTROLLER_PORT,
  SOAK_TEST_CONTROLLER_URL,
  SoakControllerAcknowledgementSchema,
  SoakControllerAttemptStartedSchema,
  SoakControllerConfigSchema,
  SoakControllerEmptyPayloadSchema,
  SoakControllerExpectedCommentsEventSchema,
  SoakControllerFatalSchema,
  SoakControllerObservationEventSchema,
  SoakControllerResultSchema,
  SoakControllerScrapedPostSchema,
  SoakControllerScraperLogSchema,
} from "../src/shared/soak-test/SoakTestProtocol";
import { type ServerAttemptProgress } from "./reports/buildProgressReport";
import { SoakControllerStateGuard } from "./SoakControllerStateGuard";

export async function startExtensionControllerServer(args: {
  config: SoakControllerConfig;
  outputDirectory: string;
  onResult: (result: SoakControllerResult) => Promise<void>;
  onProgress: (attemptProgresses: ServerAttemptProgress[]) => Promise<void>;
}): Promise<{
  url: string;
  ready: Promise<void>;
  completion: Promise<void>;
  close: () => Promise<void>;
}> {
  let resolveCompletion!: () => void;
  let rejectCompletion!: (error: Error) => void;
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  const attemptProgress = new Map<string, ServerAttemptProgress>(
    args.config.attempts.map((attempt) => [
      attempt.attemptId,
      { attempt, phase: "waiting" },
    ]),
  );
  const controllerStateGuard = new SoakControllerStateGuard(
    args.config.attempts.map((attempt) => attempt.attemptId),
  );
  const reportProgress = () => args.onProgress([...attemptProgress.values()]);
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error: unknown) => {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
      rejectCompletion(
        error instanceof Error ? error : new Error(String(error)),
      );
    });
  });

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-headers", "content-type");
    response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const prefix = "/bth-soak-test/";
    if (!pathname.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    const action = pathname.slice(prefix.length);
    if (request.method === "GET" && action === "config") {
      sendJson(response, 200, SoakControllerConfigSchema.parse(args.config));
      return;
    }
    const body = await readJson(request);
    if (request.method === "POST" && action === "ready") {
      SoakControllerEmptyPayloadSchema.parse(body);
      controllerStateGuard.claimController();
      console.info("[soak-test] Extension controller connected.");
      resolveReady();
    } else if (request.method === "POST" && action === "attempt-started") {
      const started = SoakControllerAttemptStartedSchema.parse(body);
      controllerStateGuard.startAttempt(started.attempt.attemptId);
      attemptProgress.set(started.attempt.attemptId, {
        attempt: started.attempt,
        phase: "running",
      });
      await reportProgress();
      console.info(`[soak-test] Starting ${started.attempt.attemptId}`);
    } else if (request.method === "POST" && action === "expected-comments") {
      const event = SoakControllerExpectedCommentsEventSchema.parse(body);
      const currentProgress = attemptProgress.get(event.attemptId);
      if (currentProgress) {
        if (
          currentProgress.expectedComments !== undefined &&
          currentProgress.expectedComments !== event.expectedComments
        ) {
          throw new Error(
            `Expected comments already set for ${event.attemptId}.`,
          );
        }
        attemptProgress.set(event.attemptId, {
          ...currentProgress,
          expectedComments: event.expectedComments,
        });
      }
      await reportProgress();
    } else if (request.method === "POST" && action === "event") {
      const event = SoakControllerObservationEventSchema.parse(body);
      const currentProgress = attemptProgress.get(event.attemptId);
      if (currentProgress) {
        attemptProgress.set(event.attemptId, {
          ...currentProgress,
          observation: event.observation,
        });
      }
      const attemptDirectory = path.join(
        args.outputDirectory,
        "attempts",
        event.attemptId,
      );
      await mkdir(attemptDirectory, { recursive: true });
      await appendFile(
        path.join(attemptDirectory, "events.ndjson"),
        JSON.stringify(event.observation) + "\n",
      );
      await reportProgress();
    } else if (request.method === "POST" && action === "scraper-log") {
      const scraperLog = SoakControllerScraperLogSchema.parse(body);
      const attemptDirectory = path.join(
        args.outputDirectory,
        "attempts",
        scraperLog.attemptId,
      );
      await mkdir(attemptDirectory, { recursive: true });
      await appendFile(
        path.join(attemptDirectory, "scraper-logs.ndjson"),
        JSON.stringify(scraperLog.entry) + "\n",
      );
    } else if (request.method === "POST" && action === "scraped-post") {
      const scrapedPost = SoakControllerScrapedPostSchema.parse(body);
      const attemptDirectory = path.join(
        args.outputDirectory,
        "attempts",
        scrapedPost.attemptId,
      );
      await mkdir(attemptDirectory, { recursive: true });
      await writeFile(
        path.join(attemptDirectory, "scraped-post.json"),
        JSON.stringify(scrapedPost.postSnapshot, null, 2) + "\n",
      );
    } else if (request.method === "POST" && action === "result") {
      const result = SoakControllerResultSchema.parse(body);
      controllerStateGuard.completeAttempt(result.attempt.attemptId);
      attemptProgress.set(result.attempt.attemptId, {
        attempt: result.attempt,
        phase: "completed",
        observation: result.lastObservation,
        expectedComments:
          attemptProgress.get(result.attempt.attemptId)?.expectedComments ??
          result.expectedComments,
        result,
      });
      await args.onResult(result);
      await reportProgress();
    } else if (request.method === "POST" && action === "complete") {
      SoakControllerEmptyPayloadSchema.parse(body);
      await reportProgress();
      resolveCompletion();
    } else if (request.method === "POST" && action === "fatal") {
      const fatal = SoakControllerFatalSchema.parse(body);
      for (const [attemptId, progress] of attemptProgress) {
        if (progress.phase === "running") {
          attemptProgress.set(attemptId, {
            ...progress,
            phase: "aborted",
            error: fatal.error,
          });
        } else if (progress.phase === "waiting") {
          attemptProgress.set(attemptId, { ...progress, phase: "not-run" });
        }
      }
      await reportProgress();
      rejectCompletion(new Error(fatal.error));
    } else {
      sendJson(response, 404, { error: "Unknown controller action." });
      return;
    }
    sendJson(
      response,
      200,
      SoakControllerAcknowledgementSchema.parse({ ok: true }),
    );
  }
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(SOAK_TEST_CONTROLLER_PORT, "127.0.0.1", resolve);
  });
  await reportProgress();
  return {
    url: SOAK_TEST_CONTROLLER_URL,
    ready,
    completion,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

async function readJson(request: IncomingMessage) {
  request.setEncoding("utf8");
  let text = "";
  for await (const chunk of request) {
    text += String(chunk);
  }
  return text ? (JSON.parse(text) as unknown) : {};
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
