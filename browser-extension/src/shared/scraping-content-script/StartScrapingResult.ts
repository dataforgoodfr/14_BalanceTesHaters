export type StartScrapingResult =
  | {
      type: "failed";
      errorMessage: string;
    }
  | {
      type: "started";
    };
