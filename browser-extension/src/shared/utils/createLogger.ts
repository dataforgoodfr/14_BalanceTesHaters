export type Logger = {
  debug: (...data: LogArgs) => void;
  warn: (...data: LogArgs) => void;
  info: (...data: LogArgs) => void;
  error: (...data: LogArgs) => void;
  log: (...data: LogArgs) => void;
};

export type LogArgs = unknown[];

/**
 * Creates a simple prefixed logger.
 * TODO consider using winston
 * @param loggerPrefix
 * @param baseLogger
 * @returns
 */
export function createLogger(
  loggerPrefix: string,
  baseLogger: Logger = console,
): Logger {
  return {
    debug: (...data: LogArgs) => baseLogger.debug(loggerPrefix, ...data),
    warn: (...data: LogArgs) => baseLogger.warn(loggerPrefix, ...data),
    info: (...data: LogArgs) => baseLogger.info(loggerPrefix, ...data),
    error: (...data: LogArgs) => baseLogger.error(loggerPrefix, ...data),
    log: (...data: LogArgs) => baseLogger.log(loggerPrefix, ...data),
  };
}
