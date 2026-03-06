export type ScrapingStatus =
  | ScrapingNotStarted
  | ScrapingRunning
  | ScrapingCompleted
  | ScrapingErrorStatus;
type ScrapingNotStarted = {
  type: "not-started";
};
type ScrapingRunning = {
  type: "running";
};
type ScrapingCompleted = {
  type: "completed";
};
export type ScrapingErrorStatus = {
  type: "error";
  errorMessage?: string;
};
