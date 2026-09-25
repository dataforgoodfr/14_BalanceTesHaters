import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type {
  SoakControllerConfig,
  SoakControllerResult,
} from "../src/shared/soak-test/SoakTestProtocol";
import {
  SOAK_TEST_CONTROLLER_PORT,
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
import type { ServerAttemptProgress } from "./reports/buildProgressReport";

type ExtensionControllerServerArgs = {
  config: SoakControllerConfig;
  outputDirectory: string;
  onResult: (result: SoakControllerResult) => Promise<void>;
  onProgress: (attemptProgresses: ServerAttemptProgress[]) => Promise<void>;
};

export class ExtensionControllerServer {
  static async start(
    args: ExtensionControllerServerArgs,
  ): Promise<ExtensionControllerServer> {
    const controller = new ExtensionControllerServer(args);
    await controller.listen();
    try {
      await controller.reportProgress();
    } catch (error) {
      await controller.close();
      throw error;
    }
    return controller;
  }

  private readonly config: SoakControllerConfig;
  private readonly attemptProgress: Map<string, ServerAttemptProgress>;
  private readonly server: Server;
  private readonly readyState = Promise.withResolvers<void>();
  private readonly completionState = Promise.withResolvers<void>();
  private controllerConnected = false;

  readonly ready = this.readyState.promise;
  readonly completion = this.completionState.promise;

  private constructor(private readonly args: ExtensionControllerServerArgs) {
    this.config = SoakControllerConfigSchema.parse(args.config);
    this.attemptProgress = new Map(
      this.config.attempts.map((attempt) => [
        attempt.attemptId,
        { attempt, phase: "waiting" },
      ]),
    );
    this.server = createServer((request, response) => {
      void this.handleRequest(request, response).catch((error: unknown) => {
        this.handleRequestError(response, error);
      });
    });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
  }

  private async listen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(SOAK_TEST_CONTROLLER_PORT, "127.0.0.1", resolve);
    });
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (!this.configureAccessControl(request, response)) return;
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const action = this.readAction(request);
    if (action === undefined) {
      response.writeHead(404).end();
      return;
    }
    if (request.method === "GET" && action === "config") {
      this.sendJson(response, 200, this.config);
      return;
    }
    if (request.method !== "POST") {
      this.sendJson(response, 404, { error: "Unknown controller action." });
      return;
    }

    const handled = await this.handleAction(
      action,
      await this.readJson(request),
    );
    if (!handled) {
      this.sendJson(response, 404, { error: "Unknown controller action." });
      return;
    }
    this.sendJson(response, 200, { ok: true });
  }

  private async handleAction(action: string, body: unknown): Promise<boolean> {
    switch (action) {
      case "ready":
        this.connectController(body);
        return true;
      case "attempt-started":
        await this.startAttempt(body);
        return true;
      case "expected-comments":
        await this.recordExpectedComments(body);
        return true;
      case "event":
        await this.recordObservation(body);
        return true;
      case "scraper-log":
        await this.recordScraperLog(body);
        return true;
      case "scraped-post":
        await this.recordScrapedPost(body);
        return true;
      case "result":
        await this.recordResult(body);
        return true;
      case "complete":
        await this.complete(body);
        return true;
      case "fatal":
        await this.abort(body);
        return true;
      default:
        return false;
    }
  }

  private connectController(body: unknown): void {
    SoakControllerEmptyPayloadSchema.parse(body);
    if (this.controllerConnected) {
      throw new Error(
        "A soak controller is already connected. The extension or controller page may have reloaded; aborting to avoid restarting attempts.",
      );
    }
    this.controllerConnected = true;
    console.info("[soak-test] Extension controller connected.");
    this.readyState.resolve();
  }

  private async startAttempt(body: unknown): Promise<void> {
    const started = SoakControllerAttemptStartedSchema.parse(body);
    const currentProgress = this.getAttemptProgress(started.attempt.attemptId);
    this.assertPhase(currentProgress, "waiting", "start");
    this.assertSameAttempt(currentProgress.attempt, started.attempt);
    this.attemptProgress.set(started.attempt.attemptId, {
      attempt: currentProgress.attempt,
      phase: "running",
    });
    await this.reportProgress();
    console.info(`[soak-test] Starting ${started.attempt.attemptId}`);
  }

  private async recordExpectedComments(body: unknown): Promise<void> {
    const event = SoakControllerExpectedCommentsEventSchema.parse(body);
    const currentProgress = this.getRunningAttempt(event.attemptId);
    if (
      currentProgress.expectedComments !== undefined &&
      currentProgress.expectedComments !== event.expectedComments
    ) {
      throw new Error(`Expected comments already set for ${event.attemptId}.`);
    }
    this.attemptProgress.set(event.attemptId, {
      ...currentProgress,
      expectedComments: event.expectedComments,
    });
    await this.reportProgress();
  }

  private async recordObservation(body: unknown): Promise<void> {
    const event = SoakControllerObservationEventSchema.parse(body);
    const currentProgress = this.getRunningAttempt(event.attemptId);
    this.attemptProgress.set(event.attemptId, {
      ...currentProgress,
      observation: event.observation,
    });
    const attemptDirectory = this.getAttemptDirectory(event.attemptId);
    await mkdir(attemptDirectory, { recursive: true });
    await appendFile(
      path.join(attemptDirectory, "events.ndjson"),
      JSON.stringify(event.observation) + "\n",
    );
    await this.reportProgress();
  }

  private async recordScraperLog(body: unknown): Promise<void> {
    const event = SoakControllerScraperLogSchema.parse(body);
    this.getRunningAttempt(event.attemptId);
    const attemptDirectory = this.getAttemptDirectory(event.attemptId);
    await mkdir(attemptDirectory, { recursive: true });
    await appendFile(
      path.join(attemptDirectory, "scraper-logs.ndjson"),
      JSON.stringify(event.entry) + "\n",
    );
  }

  private async recordScrapedPost(body: unknown): Promise<void> {
    const event = SoakControllerScrapedPostSchema.parse(body);
    this.getRunningAttempt(event.attemptId);
    const attemptDirectory = this.getAttemptDirectory(event.attemptId);
    await mkdir(attemptDirectory, { recursive: true });
    await writeFile(
      path.join(attemptDirectory, "scraped-post.json"),
      JSON.stringify(event.postSnapshot, null, 2) + "\n",
    );
  }

  private async recordResult(body: unknown): Promise<void> {
    const result = SoakControllerResultSchema.parse(body);
    const currentProgress = this.getRunningAttempt(result.attempt.attemptId);
    this.assertSameAttempt(currentProgress.attempt, result.attempt);
    this.attemptProgress.set(result.attempt.attemptId, {
      attempt: currentProgress.attempt,
      phase: "completed",
      observation: result.lastObservation,
      expectedComments:
        currentProgress.expectedComments ?? result.expectedComments,
      result,
    });
    await this.args.onResult(result);
    await this.reportProgress();
  }

  private async complete(body: unknown): Promise<void> {
    SoakControllerEmptyPayloadSchema.parse(body);
    const incompleteAttempt = [...this.attemptProgress.values()].find(
      (progress) => progress.phase !== "completed",
    );
    if (incompleteAttempt) {
      throw new Error(
        `Cannot complete the soak test while ${incompleteAttempt.attempt.attemptId} is ${incompleteAttempt.phase}.`,
      );
    }
    await this.reportProgress();
    this.completionState.resolve();
  }

  private async abort(body: unknown): Promise<void> {
    const fatal = SoakControllerFatalSchema.parse(body);
    for (const [attemptId, progress] of this.attemptProgress) {
      if (progress.phase === "running") {
        this.attemptProgress.set(attemptId, {
          ...progress,
          phase: "aborted",
          error: fatal.error,
        });
      } else if (progress.phase === "waiting") {
        this.attemptProgress.set(attemptId, {
          ...progress,
          phase: "not-run",
        });
      }
    }
    await this.reportProgress();
    this.completionState.reject(new Error(fatal.error));
  }

  private getAttemptProgress(attemptId: string): ServerAttemptProgress {
    const progress = this.attemptProgress.get(attemptId);
    if (!progress) throw new Error(`Unknown soak-test attempt: ${attemptId}.`);
    return progress;
  }

  private getRunningAttempt(attemptId: string): ServerAttemptProgress {
    const progress = this.getAttemptProgress(attemptId);
    this.assertPhase(progress, "running", "update");
    return progress;
  }

  private getAttemptDirectory(attemptId: string): string {
    this.getAttemptProgress(attemptId);
    return path.join(this.args.outputDirectory, "attempts", attemptId);
  }

  private assertPhase(
    progress: ServerAttemptProgress,
    expectedPhase: ServerAttemptProgress["phase"],
    action: string,
  ): void {
    if (progress.phase !== expectedPhase) {
      throw new Error(
        `Cannot ${action} soak-test attempt ${progress.attempt.attemptId} while it is ${progress.phase}.`,
      );
    }
  }

  private assertSameAttempt(
    expected: SoakControllerConfig["attempts"][number],
    received: SoakControllerConfig["attempts"][number],
  ): void {
    if (!isDeepStrictEqual(expected, received)) {
      throw new Error(
        `Attempt ${received.attemptId} differs from its configuration.`,
      );
    }
  }

  private reportProgress(): Promise<void> {
    return this.args.onProgress([...this.attemptProgress.values()]);
  }

  private configureAccessControl(
    request: IncomingMessage,
    response: ServerResponse,
  ): boolean {
    const origin = request.headers.origin;
    if (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
      this.sendJson(response, 403, { error: "Origin not allowed." });
      return false;
    }
    if (origin) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "origin");
    }
    response.setHeader("access-control-allow-headers", "content-type");
    response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    return true;
  }

  private readAction(request: IncomingMessage): string | undefined {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const prefix = "/bth-soak-test/";
    return pathname.startsWith(prefix)
      ? pathname.slice(prefix.length)
      : undefined;
  }

  private async readJson(request: IncomingMessage): Promise<unknown> {
    request.setEncoding("utf8");
    let text = "";
    for await (const chunk of request) text += String(chunk);
    return text ? (JSON.parse(text) as unknown) : {};
  }

  private sendJson(
    response: ServerResponse,
    status: number,
    body: unknown,
  ): void {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  }

  private handleRequestError(response: ServerResponse, error: unknown): void {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    this.sendJson(response, 500, { error: normalizedError.message });
    this.completionState.reject(normalizedError);
  }
}
