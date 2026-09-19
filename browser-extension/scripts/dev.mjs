import { access, mkdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const extensionDir = path.join(projectDir, ".output/chrome-mv3-dev");
const manifestPath = path.join(extensionDir, "manifest.json");
const profileDir = path.join(projectDir, ".wxt/chromium-data");
const wxtBin = path.join(projectDir, "node_modules/.bin/wxt");

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getModificationTime(filePath) {
  try {
    return (await stat(filePath)).mtimeMs;
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function resolveChromiumBin() {
  if (process.env.CHROMIUM_BIN) return process.env.CHROMIUM_BIN;

  const snapChromium = "/snap/bin/chromium";
  try {
    await access(snapChromium, constants.X_OK);
    return snapChromium;
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "EACCES") throw error;
    return "chromium";
  }
}

async function waitForBuild(previousModificationTime) {
  while (true) {
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

function waitForExit(child, name) {
  return new Promise((resolve, reject) => {
    child.once("error", (error) => {
      reject(new Error(`${name} failed to start: ${error.message}`));
    });
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function exitCodeFor({ code, signal }) {
  if (code !== null) return code;
  return signal === "SIGINT" ? 130 : 1;
}

await access(wxtBin, constants.X_OK);
const chromiumBin = await resolveChromiumBin();
const previousModificationTime = await getModificationTime(manifestPath);

const wxt = spawn(wxtBin, [], {
  cwd: projectDir,
  stdio: "inherit",
});
const wxtExit = waitForExit(wxt, "WXT");

let chromium;
let requestedExitCode;

function stop(signal, exitCode) {
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

  await mkdir(profileDir, { recursive: true });

  chromium = spawn(
    chromiumBin,
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

  const chromiumExit = waitForExit(chromium, "Chromium");
  const firstExit = await Promise.race([
    wxtExit.then((result) => ({ process: "WXT", result })),
    chromiumExit.then((result) => ({ process: "Chromium", result })),
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
  console.error(error.message);
  process.exitCode = requestedExitCode ?? 1;
}
