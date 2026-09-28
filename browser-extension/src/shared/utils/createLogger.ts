import { Logger as TslogLogger } from "tslog";
import { soakTestScraperLogTransport } from "../soak-test/SoakTestScraperLogCapture";

export type Logger = TslogLogger<Record<string, unknown>>;

export const rootLogger: Logger = new TslogLogger({
  name: "bth",
  stack: { capture: "full" },

  pretty: {
    levelMethod: {
      SILLY: console.trace,
      DEBUG: console.debug,
      INFO: console.info,
      WARN: console.warn,
      ERROR: console.error,
      FATAL: console.error,
    },
  },
});
export const scrapingLogger = rootLogger.getSubLogger({ name: "scrap" });

if (import.meta.env?.VITE_SOAK_TEST_BUILD === "true") {
  scrapingLogger.attachTransport(soakTestScraperLogTransport);
}

export function createLogger(
  name: string,
  parentLogger: Logger = rootLogger,
): Logger {
  return parentLogger.getSubLogger({ name });
}
