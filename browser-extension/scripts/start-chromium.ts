import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ProcessExit = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

export const projectDir = fileURLToPath(new URL("..", import.meta.url));
export const profileDir = path.join(projectDir, ".wxt/chromium-data");

export async function startChromium({
  extensionDir,
}: {
  extensionDir: string;
}): Promise<ChildProcess> {
  await access(path.join(extensionDir, "manifest.json"), constants.R_OK);
  await mkdir(profileDir, { recursive: true });

  return spawn(
    await resolveChromiumBin(),
    [
      `--user-data-dir=${profileDir}`,
      "--no-default-browser-check",
      `--load-extension=${extensionDir}`,
      "https://www.youtube.com",
    ],
    {
      cwd: projectDir,
      stdio: "inherit",
    },
  );
}

export function waitForExit(
  child: ChildProcess,
  name: string,
): Promise<ProcessExit> {
  return new Promise((resolve, reject) => {
    child.once("error", (error) => {
      reject(new Error(`${name} failed to start: ${error.message}`));
    });
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

export function exitCodeFor({ code, signal }: ProcessExit): number {
  if (code !== null) return code;
  return signal === "SIGINT" ? 130 : 1;
}

async function resolveChromiumBin(): Promise<string> {
  if (process.env.CHROMIUM_BIN) return process.env.CHROMIUM_BIN;

  const snapChromium = "/snap/bin/chromium";
  try {
    await access(snapChromium, constants.X_OK);
    return snapChromium;
  } catch (error) {
    if (
      !hasErrorCode(error) ||
      (error.code !== "ENOENT" && error.code !== "EACCES")
    ) {
      throw error;
    }
    return "chromium";
  }
}

function hasErrorCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function run(): Promise<void> {
  const extensionDir = path.resolve(
    process.argv[2] ?? path.join(projectDir, ".output/chrome-mv3"),
  );
  let chromium: ChildProcess | undefined;
  let requestedExitCode: number | undefined;

  const stop = (signal: NodeJS.Signals, exitCode: number): void => {
    requestedExitCode ??= exitCode;
    if (chromium?.exitCode === null) chromium.kill(signal);
  };

  process.once("SIGINT", () => stop("SIGINT", 130));
  process.once("SIGTERM", () => stop("SIGTERM", 143));

  try {
    chromium = await startChromium({ extensionDir });
    const result = await waitForExit(chromium, "Chromium");
    process.exitCode = requestedExitCode ?? exitCodeFor(result);
  } catch (error) {
    stop("SIGTERM", 1);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = requestedExitCode ?? 1;
  }
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  path.resolve(entryPath) === fileURLToPath(import.meta.url)
) {
  await run();
}
