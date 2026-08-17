import { z } from "zod";

export type ClassificationStatus = z.infer<typeof ClassificationStatusSchema>;
// ClassificationStatus Schema
export const ClassificationStatusSchema = z.enum([
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "JOB_NOT_FOUND",
]);

export function isRunningClassificationStatus(
  status: ClassificationStatus,
): boolean {
  return status === "SUBMITTED" || status === "IN_PROGRESS";
}
