import {
  ScrapingCanceled,
  ScrapingSucceeded,
  ScrapingFailed,
} from "./ScrapingStatus";

export type ScrapingResult =
  | ScrapingSucceeded
  | ScrapingFailed
  | ScrapingCanceled;
