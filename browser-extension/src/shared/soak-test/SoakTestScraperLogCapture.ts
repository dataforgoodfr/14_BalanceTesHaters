import type { ILogObj, ILogObjMeta, IMeta, Transport } from "tslog";
import { z } from "zod";

export const ScraperLogLevelSchema = z.enum([
  "debug",
  "info",
  "log",
  "warn",
  "error",
]);
export type ScraperLogLevel = z.infer<typeof ScraperLogLevelSchema>;

export const ScraperLogEntrySchema = z.object({
  recordedAt: z.iso.datetime(),
  level: ScraperLogLevelSchema,
  message: z.string(),
});
export type ScraperLogEntry = z.infer<typeof ScraperLogEntrySchema>;

export const SCRAPER_LOG_MESSAGE_TYPE = "soak-scraper-log";

export const ScraperLogMessageSchema = z.object({
  msgType: z.literal(SCRAPER_LOG_MESSAGE_TYPE),
  entry: ScraperLogEntrySchema,
});
export type ScraperLogMessage = z.infer<typeof ScraperLogMessageSchema>;

type TslogRecord = ILogObj & ILogObjMeta;

const TSLOG_META_PROPERTY = "_logMeta";

export const soakTestScraperLogTransport: Transport<Record<string, unknown>> = {
  name: "soak-scraper-log-capture",
  write(record) {
    emitScraperLog(createSoakTestScraperLogEntry(record));
  },
};

export function createSoakTestScraperLogEntry(
  record: TslogRecord,
): ScraperLogEntry {
  const metadata = record[TSLOG_META_PROPERTY] as IMeta;
  const loggerNames = [...(metadata.parentNames ?? []), metadata.name].filter(
    (name): name is string => name !== undefined,
  );
  const data = getLogData(record);

  return {
    recordedAt: metadata.date.toISOString(),
    level: toScraperLogLevel(metadata.logLevelName),
    message: formatLogArgs([
      ...(loggerNames.length > 0 ? [`[${loggerNames.join(":")}]`] : []),
      ...data,
    ]),
  };
}

function emitScraperLog(entry: ScraperLogEntry): void {
  if (
    typeof window === "undefined" ||
    window.location.protocol === "chrome-extension:"
  ) {
    return;
  }
  const message: ScraperLogMessage = {
    msgType: SCRAPER_LOG_MESSAGE_TYPE,
    entry,
  };
  void browser.runtime.sendMessage(message).catch(() => undefined);
}

function getLogData(record: TslogRecord): unknown[] {
  const entries = Object.entries(record).filter(
    ([key]) => key !== TSLOG_META_PROPERTY,
  );
  if (entries.every(([key]) => /^\d+$/.test(key))) {
    return entries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => value);
  }
  return entries.length === 0 ? [] : [Object.fromEntries(entries)];
}

function toScraperLogLevel(logLevelName: string): ScraperLogLevel {
  switch (logLevelName.toUpperCase()) {
    case "SILLY":
    case "TRACE":
    case "DEBUG":
      return "debug";
    case "INFO":
      return "info";
    case "WARN":
      return "warn";
    case "ERROR":
    case "FATAL":
      return "error";
    default:
      return "log";
  }
}

export function isSoakTestScraperLogMessage(
  value: unknown,
): value is ScraperLogMessage {
  return ScraperLogMessageSchema.safeParse(value).success;
}

function formatLogArgs(data: readonly unknown[]): string {
  const message = data.map(formatLogValue).join(" ");
  const maximumLength = 50_000;
  return message.length <= maximumLength
    ? message
    : `${message.slice(0, maximumLength)}… [truncated]`;
}

function formatLogValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    const json = JSON.stringify(createLogPreview(value, new WeakSet(), 0));
    return json ?? String(value);
  } catch {
    return String(value);
  }
}

function createLogPreview(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return value.length <= 5_000 ? value : `${value.slice(0, 5_000)}…`;
  }
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.description ?? "[symbol]";
  if (typeof value === "function") return `[function ${value.name}]`;
  if (value instanceof Error) return value.stack ?? value.message;
  if (seen.has(value)) return "[circular]";
  if (depth >= 4) return "[maximum depth]";
  seen.add(value);
  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 50)
      .map((item) => createLogPreview(item, seen, depth + 1));
    if (value.length > 50) preview.push(`[${value.length - 50} more items]`);
    return preview;
  }
  const entries = Object.entries(value);
  const preview = Object.fromEntries(
    entries
      .slice(0, 50)
      .map(([key, item]) => [key, createLogPreview(item, seen, depth + 1)]),
  );
  if (entries.length > 50) {
    preview["…"] = `[${entries.length - 50} more properties]`;
  }
  return preview;
}
