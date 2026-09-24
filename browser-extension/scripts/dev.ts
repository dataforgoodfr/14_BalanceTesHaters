import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import {
  exitCodeFor,
  projectDir,
  startChromium,
  waitForExit,
} from "./start-chromium.ts";

const extensionDir = path.join(projectDir, ".output/chrome-mv3-dev");
const manifestPath = path.join(extensionDir, "manifest.json");
const wxtBin = path.join(projectDir, "node_modules/.bin/wxt");

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getModificationTime(
  filePath: string,
): Promise<number | undefined> {
  try {
    return (await stat(filePath)).mtimeMs;
  } catch (error) {
    if (hasErrorCode(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function waitForBuild(
  previousModificationTime: number | undefined,
): Promise<void> {
  for (;;) {
    const modificationTime = await getModificationTime(manifestPath);
    if (
      modificationTime !== undefined &&
      modificationTime !== previousModificationTime
    ) {
      return;
    }
    await delay(100);
  }
}

await access(wxtBin, constants.X_OK);
const previousModificationTime = await getModificationTime(manifestPath);

const wxt = spawn(wxtBin, [], {
  cwd: projectDir,
  stdio: "inherit",
});
const wxtExit = waitForExit(wxt, "WXT");

let chromium: ChildProcess | undefined;
let requestedExitCode: number | undefined;

function stop(signal: NodeJS.Signals, exitCode: number): void {
  requestedExitCode ??= exitCode;
  if (wxt.exitCode === null) wxt.kill(signal);
  if (chromium?.exitCode === null) chromium.kill(signal);
}

process.once("SIGINT", () => stop("SIGINT", 130));
process.once("SIGTERM", () => stop("SIGTERM", 143));

try {
  await Promise.race([
    waitForBuild(previousModificationTime),
    wxtExit.then((result) => {
      throw new Error(
        `WXT stopped before the extension was built (exit ${exitCodeFor(result)})`,
      );
    }),
  ]);

  chromium = await startChromium({ extensionDir });

  const chromiumExit = waitForExit(chromium, "Chromium");
  const firstExit = await Promise.race([
    wxtExit.then((result) => ({ process: "WXT" as const, result })),
    chromiumExit.then((result) => ({ process: "Chromium" as const, result })),
  ]);

  if (firstExit.process === "WXT" && chromium.exitCode === null) {
    chromium.kill("SIGTERM");
  }
  if (firstExit.process === "Chromium" && wxt.exitCode === null) {
    wxt.kill("SIGTERM");
  }

  process.exitCode = requestedExitCode ?? exitCodeFor(firstExit.result);
} catch (error) {
  stop("SIGTERM", 1);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = requestedExitCode ?? 1;
}

function hasErrorCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
