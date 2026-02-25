export type ScrapTabResult = ScrapTabSuccess | ScrapTabError;

export type ScrapTabSuccess = {
  type: "success";
  postSnapshotId: string;
  durationMs: number;
};

export type ScrapTabError = {
  type: "error";
  message: string;
};
