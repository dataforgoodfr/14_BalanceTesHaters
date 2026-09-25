import {
  createLogger,
  scrapingLogger,
  type Logger,
} from "@/shared/utils/createLogger";

export const ytBaseLogger: Logger = createLogger("yt", scrapingLogger);
