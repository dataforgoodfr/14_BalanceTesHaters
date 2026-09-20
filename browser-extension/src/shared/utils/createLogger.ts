import { Logger as TslogLogger } from "tslog";

export type Logger = TslogLogger<Record<string, unknown>>;

export const rootLogger: Logger = new TslogLogger({
  name: "bth",
  stack: { capture: "full" },
});
export const scrapingLogger = rootLogger.getSubLogger({ name: "scrap" });

export function createLogger(
  name: string,
  parentLogger: Logger = rootLogger,
): Logger {
  return parentLogger.getSubLogger({ name });
}
